from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict

import joblib
import numpy as np

from app.core.logging import logger
from app.core.settings import settings
from app.models.motion import MotionEventType, MotionSummary

G = 9.80665
# Phone-snatch / struggle have NO public labelled dataset, so they are NOT learned. Until you
# collect labelled app data, a transparent physics heuristic flags them at a confidence that is
# deliberately BELOW the backend's 0.8 auto-SOS threshold: they are logged for the admin
# dashboard but never trigger an SOS on their own.
HEURISTIC_CONFIDENCE = 0.6
SNATCH_GYRO_PEAK_RADS = 6.0
SNATCH_ACCEL_PEAK_MS2 = 30.0
STRUGGLE_ACCEL_VARIANCE = 40.0
STRUGGLE_GYRO_MEAN_RADS = 2.5


@dataclass
class MotionClassificationResult:
    event_type: MotionEventType
    confidence: float
    class_probabilities: Dict[str, float]


def engineer(accel_mean: float, accel_peak: float, accel_var: float, gyro_mean: float, gyro_peak: float, gyro_var: float) -> Dict[str, float]:
    """Mirror of `engineer()` in notebooks/01_motion_classifier.ipynb — keep the two identical."""
    eps = 1e-6
    return {
        "accel_mean": accel_mean, "accel_peak": accel_peak, "accel_variance": accel_var,
        "gyro_mean": gyro_mean, "gyro_peak": gyro_peak, "gyro_variance": gyro_var,
        "accel_std": float(np.sqrt(max(accel_var, 0.0))),
        "gyro_std": float(np.sqrt(max(gyro_var, 0.0))),
        "accel_peak_to_mean": accel_peak / (accel_mean + eps),
        "gyro_peak_to_mean": gyro_peak / (gyro_mean + eps),
        "accel_dyn_range": accel_peak - accel_mean,
        "accel_excess_g": accel_peak - G,
        "gyro_to_accel_peak": gyro_peak / (accel_peak + eps),
        "log_accel_var": float(np.log1p(max(accel_var, 0.0))),
        "log_gyro_var": float(np.log1p(max(gyro_var, 0.0))),
    }


class MotionClassifierService:
    """Calibrated classifier trained on real SisFall accelerometer/gyroscope recordings
    (notebooks/01_motion_classifier.ipynb)."""

    def __init__(self, model_path: str, metadata_path: str) -> None:
        self._model = None
        self._feature_names: list[str] = []
        self._serving_map: dict[str, str] = {}

        model_file, metadata_file = Path(model_path), Path(metadata_path)
        if not model_file.exists() or not metadata_file.exists():
            logger.warning("Motion classifier artifacts not found at %s — run notebooks/01_motion_classifier.ipynb. "
                           "Using a fixed-threshold fallback.", model_path)
            return

        self._model = joblib.load(model_file)
        metadata = json.loads(metadata_file.read_text())
        self._feature_names = metadata["feature_names"]
        self._serving_map = metadata.get("serving_map", {})
        ev = metadata.get("evaluation", {})
        logger.info("Loaded motion classifier '%s' (held-out macro-F1=%.3f, fall recall@0.8=%.3f)",
                    metadata.get("model_name"), ev.get("test_macro_f1", float("nan")), ev.get("fall_recall_at_0.8", float("nan")))

    @property
    def is_trained_model_loaded(self) -> bool:
        return self._model is not None

    def classify(self, accelerometer: MotionSummary, gyroscope: MotionSummary) -> MotionClassificationResult:
        if self._model is None:
            return self._fallback(accelerometer, gyroscope)

        feats = engineer(accelerometer.mean_magnitude, accelerometer.peak_magnitude, accelerometer.variance,
                         gyroscope.mean_magnitude, gyroscope.peak_magnitude, gyroscope.variance)
        x = np.array([[feats[n] for n in self._feature_names]], dtype=float)
        raw = dict(zip(self._model.classes_, self._model.predict_proba(x)[0].tolist()))

        # Fold learned-but-not-reportable classes (e.g. abrupt_motion = stumble/jump) into their serving class.
        probs: Dict[str, float] = {}
        for label, p in raw.items():
            target = self._serving_map.get(label, label)
            probs[target] = probs.get(target, 0.0) + p
        for label in ("normal", "running", "phone_snatch", "violent_movement", "sudden_fall"):
            probs.setdefault(label, 0.0)

        best = max(probs, key=probs.get)  # type: ignore[arg-type]
        if best in ("normal", "running"):
            heuristic = self._heuristic_event(accelerometer, gyroscope)
            if heuristic:
                probs[heuristic] = max(probs[heuristic], HEURISTIC_CONFIDENCE)
                return MotionClassificationResult(heuristic, HEURISTIC_CONFIDENCE, probs)  # type: ignore[arg-type]
        return MotionClassificationResult(best, probs[best], probs)  # type: ignore[arg-type]

    @staticmethod
    def _heuristic_event(a: MotionSummary, g: MotionSummary) -> str | None:
        if g.peak_magnitude >= SNATCH_GYRO_PEAK_RADS and a.peak_magnitude >= SNATCH_ACCEL_PEAK_MS2:
            return "phone_snatch"
        if a.variance >= STRUGGLE_ACCEL_VARIANCE and g.mean_magnitude >= STRUGGLE_GYRO_MEAN_RADS:
            return "violent_movement"
        return None

    @staticmethod
    def _fallback(a: MotionSummary, g: MotionSummary) -> MotionClassificationResult:
        if a.peak_magnitude > 25 and a.mean_magnitude < 9:
            label: MotionEventType = "sudden_fall"
        elif g.peak_magnitude > 5:
            label = "phone_snatch"
        elif a.variance > 5:
            label = "violent_movement"
        elif a.mean_magnitude > 11:
            label = "running"
        else:
            label = "normal"
        probs = {n: (0.5 if n == label else 0.125) for n in ("normal", "running", "phone_snatch", "violent_movement", "sudden_fall")}
        return MotionClassificationResult(label, probs[label], probs)


motion_classifier_service = MotionClassifierService(settings.motion_classifier_path, settings.motion_classifier_metadata_path)
