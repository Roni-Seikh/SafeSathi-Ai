from __future__ import annotations

import io
from dataclasses import dataclass
from typing import Optional, Tuple

import librosa
import numpy as np
import soundfile as sf

from app.core.logging import logger
from app.utils.audio import transcode_to_wav_via_ffmpeg

# Below this RMS, treat the clip as silence/noise rather than guessing.
MIN_RMS_FOR_ANALYSIS = 1e-4

# Empirically-reasoned thresholds, not learned from a labeled dataset (none
# is available — see ai-services/README.md for the honest reasoning and
# what would improve this). Pitch, loudness, and spectral centroid are
# well-established acoustic correlates of screaming in the voice-science
# literature, which is why this is a defensible heuristic baseline rather
# than a fabricated "trained model."
SCREAM_PITCH_FLOOR_HZ = 300.0
SCREAM_PITCH_CEILING_HZ = 1000.0
SCREAM_LOUDNESS_FLOOR_DB = -20.0
SCREAM_LOUDNESS_CEILING_DB = 0.0
FEAR_JITTER_FLOOR = 0.15  # coefficient of variation of f0 over the clip
FEAR_JITTER_CEILING = 0.45


@dataclass
class ToneResult:
    pitch_hz: Optional[float]
    loudness_db: Optional[float]
    scream_probability: float
    fear_probability: float


def _normalize(value: Optional[float], floor: float, ceiling: float) -> float:
    """Linearly maps value onto [0, 1], clamped. None maps to 0."""
    if value is None or ceiling <= floor:
        return 0.0
    return float(np.clip((value - floor) / (ceiling - floor), 0.0, 1.0))


class ToneAnalysisService:
    """Scores an audio clip for scream/fear likelihood from pitch,
    loudness, and spectral shape. Expects WAV/PCM (see ai-services/README.md
    for why — reliable decoding without extra native codec dependencies)."""

    def analyze(self, audio_bytes: bytes) -> ToneResult:
        y, sr = self._load_audio(audio_bytes)

        if y.size == 0:
            return ToneResult(None, None, 0.0, 0.0)

        rms = librosa.feature.rms(y=y)[0]
        mean_rms = float(np.mean(rms)) if rms.size else 0.0

        if mean_rms < MIN_RMS_FOR_ANALYSIS:
            return ToneResult(None, None, 0.0, 0.0)

        loudness_db = float(librosa.amplitude_to_db(np.array([mean_rms]), ref=1.0)[0])

        pitch_hz, pitch_jitter = self._estimate_pitch(y, sr)

        spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
        mean_centroid = float(np.mean(spectral_centroid)) if spectral_centroid.size else 0.0
        # Normalized against a fraction of Nyquist so this is roughly
        # sample-rate independent rather than tuned to one specific sr.
        centroid_score = _normalize(mean_centroid, sr * 0.05, sr * 0.25)

        pitch_score = _normalize(pitch_hz, SCREAM_PITCH_FLOOR_HZ, SCREAM_PITCH_CEILING_HZ)
        loudness_score = _normalize(loudness_db, SCREAM_LOUDNESS_FLOOR_DB, SCREAM_LOUDNESS_CEILING_DB)

        scream_probability = float(
            np.clip(0.45 * pitch_score + 0.35 * loudness_score + 0.20 * centroid_score, 0.0, 1.0)
        )
        jitter_score = _normalize(pitch_jitter, FEAR_JITTER_FLOOR, FEAR_JITTER_CEILING)
        fear_probability = float(np.clip(0.5 * jitter_score + 0.5 * loudness_score, 0.0, 1.0))

        return ToneResult(
            pitch_hz=pitch_hz,
            loudness_db=loudness_db,
            scream_probability=scream_probability,
            fear_probability=fear_probability,
        )

    @staticmethod
    def _estimate_pitch(y: np.ndarray, sr: int) -> Tuple[Optional[float], float]:
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=float(librosa.note_to_hz("C2")),
            fmax=float(librosa.note_to_hz("C7")),
            sr=sr,
        )
        if f0 is None or voiced_flag is None:
            return None, 0.0

        voiced_f0 = f0[voiced_flag]
        voiced_f0 = voiced_f0[~np.isnan(voiced_f0)]
        if voiced_f0.size == 0:
            return None, 0.0

        mean_f0 = float(np.mean(voiced_f0))
        jitter = float(np.std(voiced_f0) / mean_f0) if mean_f0 > 0 else 0.0
        return mean_f0, jitter

    @staticmethod
    def _load_audio(audio_bytes: bytes) -> Tuple[np.ndarray, int]:
        try:
            data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
        except Exception as exc:  # not a soundfile-native container (wav/flac/ogg) — e.g. a
            # phone's default m4a/aac recording. librosa >=0.10 no longer falls back to
            # audioread for file-like objects the way older versions did (verified against
            # the installed version here — this isn't a theoretical concern), so decode via
            # ffmpeg directly rather than relying on that path.
            logger.info("soundfile couldn't read this container directly (%s); converting via ffmpeg", exc)
            wav_bytes = transcode_to_wav_via_ffmpeg(audio_bytes)
            data, sr = sf.read(io.BytesIO(wav_bytes), dtype="float32", always_2d=False)

        if data.ndim > 1:
            data = np.mean(data, axis=1)
        return data.astype(np.float32), sr


tone_analysis_service = ToneAnalysisService()
