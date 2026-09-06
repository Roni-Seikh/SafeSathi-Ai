from fastapi import FastAPI

from app.api import motion, safescore, voice
from app.core.logging import logger
from app.core.settings import settings

app = FastAPI(
    title="SafeSathi AI Services",
    description=(
        "Internal microservice — voice keyword spotting, tone analysis, motion "
        "classification, and SafeScore. Called by the Node backend only; not "
        "exposed to the mobile app or admin dashboard directly. "
        "See docs/architecture/API_DESIGN.md §17."
    ),
    version="0.1.0",
)

app.include_router(voice.router)
app.include_router(motion.router)
app.include_router(safescore.router)


@app.get("/health")
async def health() -> dict:
    from app.services.motion_classifier_service import motion_classifier_service
    from app.services.vosk_keyword_service import vosk_keyword_service

    return {
        "status": "ok",
        "env": settings.env,
        "motion_classifier_loaded": motion_classifier_service.is_trained_model_loaded,
        "vosk_languages_available": {
            lang: vosk_keyword_service.is_available(lang) for lang in ("en", "hi", "bn")
        },
    }


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("SafeSathi AI Services starting up on port %s [%s]", settings.port, settings.env)
