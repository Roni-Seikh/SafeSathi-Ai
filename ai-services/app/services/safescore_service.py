from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from app.core.settings import settings
from app.models.batch_safescore import BatchSafeScoreItem, BatchSafeScoreResultItem
from app.models.safescore import SafeScoreFactors, SafeScoreRequest, SafeScoreResponse

# Hour-of-day risk curve — higher score (safer) during daylight/evening
# hours, lower late at night. A simple lookup rather than a continuous
# function, since the actual shape should come from regional data
# eventually; documented here as the placeholder policy until then.
_HOURLY_TIME_SCORE = {
    **{h: 35 for h in range(0, 5)},  # 00:00-04:59 — lowest
    **{h: 55 for h in range(5, 7)},  # 05:00-06:59 — pre-dawn
    **{h: 85 for h in range(7, 18)},  # 07:00-17:59 — daylight
    **{h: 65 for h in range(18, 21)},  # 18:00-20:59 — evening
    **{h: 45 for h in range(21, 24)},  # 21:00-23:59 — late evening
}


def _time_of_day_score(hour: int) -> float:
    return float(_HOURLY_TIME_SCORE[hour % 24])


def _motion_score(motion_anomaly_confidence: float) -> float:
    """100 * (1 - confidence) — see SAFESCORE_ALGORITHM.md §4."""
    return float(100 * (1 - max(0.0, min(1.0, motion_anomaly_confidence))))


class SafeScoreService:
    def compute(self, request: SafeScoreRequest) -> SafeScoreResponse:
        hour = request.hour_of_day if request.hour_of_day is not None else datetime.now(timezone.utc).hour
        factors, safe_score = self._score(
            hour=hour,
            battery_level=request.battery_level,
            motion_anomaly_confidence=request.motion_anomaly_confidence,
            crime_score=request.crime_score,
            light_score=request.light_score,
            reports_score=request.reports_score,
            trust_score=request.trust_score,
        )
        return SafeScoreResponse(safe_score=safe_score, factors=factors)

    def compute_batch(self, items: List[BatchSafeScoreItem]) -> List[BatchSafeScoreResultItem]:
        """Used by the backend's RouteService (scoring samples along
        candidate routes) and HeatmapService (scoring grid cells) — one
        HTTP round trip instead of one per point, which matters once a
        route has a dozen sample points across two candidates, or a
        heatmap recalculation covers dozens of cells."""
        results: List[BatchSafeScoreResultItem] = []
        default_hour = datetime.now(timezone.utc).hour
        for item in items:
            hour = item.hour_of_day if item.hour_of_day is not None else default_hour
            factors, safe_score = self._score(
                hour=hour,
                battery_level=item.battery_level,
                motion_anomaly_confidence=item.motion_anomaly_confidence,
                crime_score=item.crime_score,
                light_score=item.light_score,
                reports_score=item.reports_score,
                trust_score=item.trust_score,
            )
            results.append(BatchSafeScoreResultItem(id=item.id, safe_score=safe_score, factors=factors))
        return results

    @staticmethod
    def _score(
        hour: int,
        battery_level: float,
        motion_anomaly_confidence: float,
        crime_score: float,
        light_score: float,
        reports_score: float,
        trust_score: float,
    ) -> tuple[SafeScoreFactors, int]:
        factors = SafeScoreFactors(
            time=_time_of_day_score(hour),
            crime=crime_score,
            light=light_score,
            battery=battery_level,
            motion=_motion_score(motion_anomaly_confidence),
            reports=reports_score,
            trust=trust_score,
        )
        raw = (
            settings.safescore_weight_time * factors.time
            + settings.safescore_weight_crime * factors.crime
            + settings.safescore_weight_light * factors.light
            + settings.safescore_weight_battery * factors.battery
            + settings.safescore_weight_motion * factors.motion
            + settings.safescore_weight_reports * factors.reports
            + settings.safescore_weight_trust * factors.trust
        )
        safe_score = int(round(max(0.0, min(100.0, raw))))
        return factors, safe_score


safescore_service = SafeScoreService()
