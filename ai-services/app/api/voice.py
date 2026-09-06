from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.models.voice import SupportedLanguage, ToneAnalysis, VoiceAnalysisResponse
from app.services.tone_analysis_service import tone_analysis_service
from app.services.vosk_keyword_service import vosk_keyword_service

router = APIRouter(prefix="/internal/voice", tags=["voice"])


@router.post("/analyze", response_model=VoiceAnalysisResponse)
async def analyze_voice(
    language: SupportedLanguage = Form(...),
    audio: UploadFile = File(..., description="16-bit mono PCM WAV"),
) -> VoiceAnalysisResponse:
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Empty audio upload")

    keyword, keyword_confidence, _transcript = vosk_keyword_service.detect(audio_bytes, language)
    tone = tone_analysis_service.analyze(audio_bytes)

    return VoiceAnalysisResponse(
        detected_keyword=keyword,
        keyword_confidence=keyword_confidence,
        language=language,
        tone_analysis=ToneAnalysis(
            pitch_hz=tone.pitch_hz,
            loudness_db=tone.loudness_db,
            scream_probability=tone.scream_probability,
            fear_probability=tone.fear_probability,
        ),
        keyword_engine_available=vosk_keyword_service.is_available(language),
    )
