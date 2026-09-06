from typing import Literal

from pydantic import BaseModel, Field

MotionEventType = Literal["running", "phone_snatch", "violent_movement", "sudden_fall", "normal"]


class MotionSummary(BaseModel):
    """Mirrors backend/src/models/SensorLog.model.ts IMotionSummary —
    summary statistics over an analysis window, not raw sample streams."""

    mean_magnitude: float = Field(ge=0)
    peak_magnitude: float = Field(ge=0)
    variance: float = Field(ge=0)


class MotionClassifyRequest(BaseModel):
    accelerometer: MotionSummary
    gyroscope: MotionSummary


class MotionClassifyResponse(BaseModel):
    event_type: MotionEventType
    confidence: float = Field(ge=0, le=1)
    """Highest class probability from the trained classifier."""
    class_probabilities: dict[MotionEventType, float]
