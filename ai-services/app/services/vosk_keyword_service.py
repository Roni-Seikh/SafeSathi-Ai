from __future__ import annotations

import io
import json
import wave
from pathlib import Path
from typing import Dict, Optional

from app.core.logging import logger
from app.core.settings import settings
from app.models.voice import DetectedKeyword, SupportedLanguage
from app.utils.audio import transcode_to_wav_via_ffmpeg

try:
    import vosk

    vosk.SetLogLevel(-1)  # silence Kaldi's own stderr logging
except ImportError:  # pragma: no cover - vosk is a required dependency, this guards import order only
    vosk = None  # type: ignore[assignment]

# The exact keyword set from docs/architecture/API_DESIGN.md /
# backend/src/models/VoiceLog.model.ts DetectedKeyword, minus "none".
# Vosk returns free-text transcription; this service matches the
# transcript against these phrases per language rather than doing
# constrained-grammar recognition, since a few short phrases don't need
# SetGrammar's complexity and free transcription also lets a caller see
# what was actually heard (data.details.transcript) for debugging.
KEYWORDS_BY_LANGUAGE: Dict[SupportedLanguage, Dict[str, DetectedKeyword]] = {
    "en": {"help": "help", "save me": "save_me", "stop": "stop"},
    "hi": {"bachao": "bachao"},
    "bn": {"chere din": "chere_din", "chhere dao": "chere_din"},
}


class VoskKeywordService:
    """
    Loads one Vosk model per language that has a working download (see
    ai-services/README.md). As of this writing that's English and Hindi —
    `vosk-model-small-en-us-0.15` and `vosk-model-small-hi-0.22` are live,
    confirmed downloads. Bengali is NOT loaded here: AlphaCephei's classic
    Kaldi-format small Bengali model's download links are currently dead
    upstream (alphacep/vosk-api issue #1961), and their replacement
    (`vosk-model-small-streaming-bn`) is a Zipformer2/sherpa-onnx model —
    a different inference engine, incompatible with this `vosk` package's
    Model/KaldiRecognizer classes. is_available('bn') is False until
    either the classic model is restored or a sherpa-onnx-based engine is
    added behind this same interface for that one language.
    """

    def __init__(self) -> None:
        self._models: Dict[SupportedLanguage, "vosk.Model"] = {}
        self._load(language="en", path=settings.vosk_model_path_en)
        self._load(language="hi", path=settings.vosk_model_path_hi)
        # Deliberately not attempting "bn" — see class docstring.

    def _load(self, language: SupportedLanguage, path: str) -> None:
        if vosk is None:
            logger.error("vosk package not importable — keyword spotting is fully disabled")
            return
        if not Path(path).exists():
            logger.warning(
                "Vosk model for '%s' not found at %s — run ai-services/scripts/download_vosk_models.sh. "
                "Keyword spotting for this language will report keyword_engine_available=false.",
                language,
                path,
            )
            return
        try:
            self._models[language] = vosk.Model(path)
            logger.info("Loaded Vosk model for '%s' from %s", language, path)
        except Exception as exc:
            logger.error("Failed to load Vosk model for '%s' at %s: %s", language, path, exc)

    def is_available(self, language: SupportedLanguage) -> bool:
        return language in self._models

    def detect(self, audio_bytes: bytes, language: SupportedLanguage) -> tuple[DetectedKeyword, float, Optional[str]]:
        """Returns (keyword, confidence, raw_transcript). Accepts raw WAV
        or a compressed format like m4a/AAC (auto-transcoded via ffmpeg —
        see app/utils/audio.py); confidence is binary-ish (0.9 on a
        match, 0.0 otherwise) because Vosk's word-level confidence output
        is noisy for short phrases — a transcript match against a known
        short phrase list is a more reliable signal here than trusting
        per-word confidence scores."""
        model = self._models.get(language)
        if model is None:
            return "none", 0.0, None

        pcm, sample_rate = self._read_wav_pcm(audio_bytes)
        recognizer = vosk.KaldiRecognizer(model, sample_rate)
        recognizer.AcceptWaveform(pcm)
        result = json.loads(recognizer.FinalResult())
        transcript = (result.get("text") or "").strip().lower()

        if not transcript:
            return "none", 0.0, transcript

        for phrase, keyword in KEYWORDS_BY_LANGUAGE.get(language, {}).items():
            if phrase in transcript:
                return keyword, 0.9, transcript

        return "none", 0.0, transcript

    @staticmethod
    def _read_wav_pcm(audio_bytes: bytes) -> tuple[bytes, int]:
        try:
            return VoskKeywordService._read_wav_pcm_direct(audio_bytes)
        except (wave.Error, EOFError) as exc:
            # Not a raw WAV container — most likely the phone's default
            # m4a/AAC recording (see app/utils/audio.py's docstring for
            # why that's the realistic on-device format, not raw PCM).
            logger.info("Audio isn't raw WAV (%s); converting via ffmpeg", exc)
            wav_bytes = transcode_to_wav_via_ffmpeg(audio_bytes)
            return VoskKeywordService._read_wav_pcm_direct(wav_bytes)

    @staticmethod
    def _read_wav_pcm_direct(audio_bytes: bytes) -> tuple[bytes, int]:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wav_file:
            if wav_file.getsampwidth() != 2 or wav_file.getnchannels() != 1:
                raise ValueError("Expected 16-bit mono PCM WAV after any necessary transcoding")
            frames = wav_file.readframes(wav_file.getnframes())
            return frames, wav_file.getframerate()


vosk_keyword_service = VoskKeywordService()
