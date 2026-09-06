from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.safescore import SafeScoreFactors


class BatchSafeScoreItem(BaseModel):
    """One scoring request within a batch — same fields as
    SafeScoreRequest, plus a caller-supplied id for correlating results
    back to whatever the caller's input was (a route sample point, a
    heatmap grid cell)."""

    id: str
    battery_level: float = Field(ge=0, le=100)
    motion_anomaly_confidence: float = Field(default=0.0, ge=0, le=1)
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    crime_score: float = Field(default=70.0, ge=0, le=100)
    light_score: float = Field(default=70.0, ge=0, le=100)
    reports_score: float = Field(default=70.0, ge=0, le=100)
    trust_score: float = Field(default=70.0, ge=0, le=100)


class BatchSafeScoreRequest(BaseModel):
    items: List[BatchSafeScoreItem] = Field(min_length=1, max_length=500)


class BatchSafeScoreResultItem(BaseModel):
    id: str
    safe_score: int = Field(ge=0, le=100)
    factors: SafeScoreFactors


class BatchSafeScoreResponse(BaseModel):
    results: List[BatchSafeScoreResultItem]
