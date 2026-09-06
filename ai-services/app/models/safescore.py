from typing import Optional

from pydantic import BaseModel, Field


class SafeScoreRequest(BaseModel):
    battery_level: float = Field(ge=0, le=100, description="Device battery percentage")
    motion_anomaly_confidence: float = Field(
        default=0.0, ge=0, le=1, description="From /internal/motion/classify — 0 means normal movement"
    )
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23, description="Defaults to the server's current hour")

    # Geo-dependent factors — real values come from the backend's
    # HeatmapService once Phase 6 wires up the crime dataset, OSM road
    # data, and Report/SOSLog density queries. Until then these default to
    # a neutral 70 (per docs/architecture/SAFESCORE_ALGORITHM.md §4's
    # "sparse data ≠ falsely safe or falsely dangerous" rule), so the
    # formula and its interface are already final and Phase 6 only needs
    # to start passing real numbers, not change this contract.
    crime_score: float = Field(default=70.0, ge=0, le=100)
    light_score: float = Field(default=70.0, ge=0, le=100)
    reports_score: float = Field(default=70.0, ge=0, le=100)
    trust_score: float = Field(default=70.0, ge=0, le=100)


class SafeScoreFactors(BaseModel):
    time: float
    crime: float
    light: float
    battery: float
    motion: float
    reports: float
    trust: float


class SafeScoreResponse(BaseModel):
    safe_score: int = Field(ge=0, le=100)
    factors: SafeScoreFactors
