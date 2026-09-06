from typing import Literal, Optional

from pydantic import BaseModel, Field

SupportedLanguage = Literal["en", "hi", "bn"]
DetectedKeyword = Literal["help", "save_me", "bachao", "chere_din", "stop", "none"]


class ToneAnalysis(BaseModel):
    """Mirrors backend/src/models/VoiceLog.model.ts IToneAnalysis."""

    pitch_hz: Optional[float] = None
    loudness_db: Optional[float] = None
    scream_probability: float = Field(ge=0, le=1)
    fear_probability: float = Field(ge=0, le=1)


class VoiceAnalysisResponse(BaseModel):
    detected_keyword: DetectedKeyword
    keyword_confidence: float = Field(ge=0, le=1)
    language: SupportedLanguage
    tone_analysis: ToneAnalysis
    keyword_engine_available: bool
    """False when no Vosk model is loaded for this language (currently
    true for en/hi, false for bn — see ai-services/README.md). Tone
    analysis runs regardless, since it doesn't depend on Vosk at all."""
