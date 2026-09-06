from fastapi import APIRouter

from app.models.motion import MotionClassifyRequest, MotionClassifyResponse
from app.services.motion_classifier_service import motion_classifier_service

router = APIRouter(prefix="/internal/motion", tags=["motion"])


@router.post("/classify", response_model=MotionClassifyResponse)
async def classify_motion(payload: MotionClassifyRequest) -> MotionClassifyResponse:
    result = motion_classifier_service.classify(payload.accelerometer, payload.gyroscope)
    return MotionClassifyResponse(
        event_type=result.event_type,
        confidence=result.confidence,
        class_probabilities=result.class_probabilities,
    )
