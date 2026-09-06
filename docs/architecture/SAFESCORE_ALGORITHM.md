# SafeSathi — The SafeScore Algorithm

SafeScore is a single number, **0–100 (100 = safest)**, computed for
either a point (the Home Dashboard) or an entire route (Safe Route
Recommendation). It is the one number the rest of the AI features
ultimately feed into or read from.

## 1. Inputs

| Factor | Symbol | Range (raw) | Source |
|---|---|---|---|
| Time-of-day risk | `f_time` | 0–100 | Hour-of-day risk curve, higher at night |
| Area crime/incident density | `f_crime` | 0–100 | Historical crime dataset + verified `Reports` in the zone |
| Road lighting / infrastructure | `f_light` | 0–100 | OpenStreetMap tags (`lit=yes/no`, road `highway` class) |
| Device battery level | `f_battery` | 0–100 | Directly from device (low battery = can't call for help) |
| Movement anomaly | `f_motion` | 0–100 | Output of the on-device/AI motion classifier; 100 = normal gait |
| Nearby active reports (24h) | `f_reports` | 0–100 | Count of unresolved `Reports`/`SOSLogs` within radius, inverted |
| Proximity to trusted places | `f_trust` | 0–100 | Distance to nearest police station / hospital / verified safe zone |

Every factor is normalized to **0–100 where 100 is always the safer end**,
so they can be combined with a single weighted sum without sign flips
scattered through the code.

## 2. Weights

```
w_time    = 0.15
w_crime   = 0.20
w_light   = 0.10
w_battery = 0.05
w_motion  = 0.15
w_reports = 0.20
w_trust   = 0.15
─────────────────
Σw        = 1.00
```

Weights live in `ai-services/app/core/settings.py` (Phase 5) as
configuration, not hard-coded in the formula, so they can be tuned without
a code change as real usage data comes in.

## 3. Formula

```
SafeScore = clamp(
    w_time    * f_time
  + w_crime   * f_crime
  + w_light   * f_light
  + w_battery * f_battery
  + w_motion  * f_motion
  + w_reports * f_reports
  + w_trust   * f_trust
  , 0, 100
)
```

## 4. Factor Normalization (how each raw signal becomes 0–100)

- **`f_time`** — a lookup curve over 24 hours (e.g. 22:00–05:00 scores
  lowest, 09:00–18:00 scores highest), configurable per city/region later.
- **`f_crime`** — `100 - min(100, incidentsInZoneLast90Days * k)` for a
  tunable constant `k`; zones with no data default to a neutral 70, not
  100, so sparse data doesn't look artificially safe.
- **`f_light`** — OSM `lit=yes` on the nearest road segment → 100;
  `lit=no` → 40; untagged → 60 (neutral default).
- **`f_battery`** — the device battery percentage directly (0–100).
- **`f_motion`** — `100 * (1 - motionAnomalyConfidence)`, where
  `motionAnomalyConfidence` is the classifier's confidence that the
  current motion pattern is `phone_snatch` / `violent_movement` /
  `sudden_fall` rather than `normal` or `running`.
- **`f_reports`** — `100 - min(100, activeReportsWithinRadius * k2)`,
  same shape as `f_crime` but for *recent* (24h) signal rather than
  historical.
- **`f_trust`** — `100 * exp(-distanceToNearestTrustedPlaceMeters / d0)`
  for a tunable decay constant `d0` (e.g. 500m), so being right next to a
  police station scores near 100 and it decays smoothly with distance.

## 5. Reference Implementation (pseudocode)

```python
def compute_safescore(point: GeoPoint, context: ScoreContext) -> int:
    f_time    = time_of_day_risk(context.now)
    f_crime   = crime_density_score(point, context.crime_dataset)
    f_light   = road_lighting_score(point, context.osm_data)
    f_battery = context.device_battery_percent
    f_motion  = 100 * (1 - context.motion_anomaly_confidence)
    f_reports = nearby_active_report_score(point, radius_m=800)
    f_trust   = trusted_place_proximity_score(point)

    raw = (
        WEIGHTS.time    * f_time    +
        WEIGHTS.crime   * f_crime   +
        WEIGHTS.light   * f_light   +
        WEIGHTS.battery * f_battery +
        WEIGHTS.motion  * f_motion  +
        WEIGHTS.reports * f_reports +
        WEIGHTS.trust   * f_trust
    )
    return round(max(0, min(100, raw)))
```

## 6. Two Modes of Use

- **Point mode (Home Dashboard):** computed for the user's current
  location, refreshed periodically (e.g. every 5 minutes while the app is
  foregrounded, or on significant location change).
- **Route mode (Safe Route Recommendation):** the candidate route is
  sampled at fixed intervals (e.g. every 200m); each sample point gets a
  SafeScore, and the route's overall score is the **minimum** of its
  sample scores, not the average — a route is only as safe as its most
  dangerous stretch. This is what powers the Route A/B comparison in the
  wireframe (`WIREFRAMES.md §11`).

## 7. Where It's Used

| Feature | How SafeScore is used |
|---|---|
| Home Dashboard | Shown directly, refreshed periodically |
| Safe Route Recommendation | Ranks candidate routes (min-along-route score) |
| Auto-SOS pipeline | Snapshotted onto the `SOSLog` at trigger time for later analysis |
| Risk Zone Heatmap | `Heatmap.riskScore` per zone is `100 - SafeScore` averaged over recent samples in that zone, mapped to green/yellow/red bands (e.g. ≥70 green, 40–69 yellow, <40 red) |
| Community Alerts | A sharp drop in a zone's SafeScore over a short window can trigger a proximity alert |

This is implemented as `SafeScoreService` in `ai-services/app/services/`
in **Phase 5**, exposed at `POST /internal/safescore` (see
`API_DESIGN.md §17`), and consumed by the backend wherever a score is
needed.
