from __future__ import annotations

import io
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

import joblib
import librosa
import numpy as np
import soundfile as sf

from app.core.logging import logger
from app.core.settings import settings
from app.utils.audio import transcode_to_wav_via_ffmpeg

# Below this RMS, treat the clip as silence/noise rather than guessing —
# and rather than asking the trained model to make a call it was never
# trained to make (see notebooks/02_tone_classifier.ipynb for why "silence"
# isn't one of its classes).
MIN_RMS_FOR_ANALYSIS = 1e-4

# Only used if the trained model artifact is missing — a crude safety net
# matching the fallback pattern in motion_classifier_service.py, not a
# substitute for running notebooks/02_tone_classifier.ipynb. Same
# empirically-reasoned thresholds this service used before the model
# existed; see that notebook's section 2 for the full reasoning, now
# expressed as trainable distributions instead of hand-set cutoffs.
FALLBACK_SCREAM_PITCH_FLOOR_HZ = 300.0
FALLBACK_SCREAM_PITCH_CEILING_HZ = 1000.0
FALLBACK_SCREAM_LOUDNESS_FLOOR_DB = -20.0
FALLBACK_SCREAM_LOUDNESS_CEILING_DB = 0.0
FALLBACK_FEAR_JITTER_FLOOR = 0.15
FALLBACK_FEAR_JITTER_CEILING = 0.45


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
    for why — reliable decoding without extra native codec dependencies).

    Feature extraction (pitch, loudness, spectral centroid, jitter) is
    unconditional — always computed the same way. The *decision* layer
    uses a trained RandomForestClassifier (see
    notebooks/02_tone_classifier.ipynb) when its artifact is present, and
    falls back to the original fixed-threshold formula only if it's
    missing — matching the exact pattern in motion_classifier_service.py.
    """

    def __init__(self, model_path: str, metadata_path: str) -> None:
        self._model = None
        self._feature_names: list[str] = []
        self._class_labels: list[str] = []

        model_file = Path(model_path)
        metadata_file = Path(metadata_path)

        if not model_file.exists() or not metadata_file.exists():
            logger.warning(
                "Tone classifier artifacts not found at %s — run "
                "`jupyter notebook notebooks/02_tone_classifier.ipynb` first. "
                "Falling back to a fixed-threshold formula until then.",
                model_path,
            )
            return

        self._model = joblib.load(model_file)
        metadata = json.loads(metadata_file.read_text())
        self._feature_names = metadata["feature_names"]
        self._class_labels = metadata["class_labels"]
        logger.info(
            "Loaded tone classifier (test_accuracy=%.3f, cv_accuracy=%.3f)",
            metadata.get("test_accuracy", float("nan")),
            metadata.get("cv_accuracy_mean", float("nan")),
        )

    @property
    def is_trained_model_loaded(self) -> bool:
        return self._model is not None

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

        if self._model is not None:
            scream_probability, fear_probability = self._classify_with_model(
                pitch_hz, loudness_db, mean_centroid, pitch_jitter
            )
        else:
            scream_probability, fear_probability = self._classify_with_fallback_thresholds(
                pitch_hz, loudness_db, mean_centroid, pitch_jitter, sr
            )

        return ToneResult(
            pitch_hz=pitch_hz,
            loudness_db=loudness_db,
            scream_probability=scream_probability,
            fear_probability=fear_probability,
        )

    def _classify_with_model(
        self, pitch_hz: Optional[float], loudness_db: float, spectral_centroid_hz: float, pitch_jitter: float
    ) -> Tuple[float, float]:
        features = np.array([[pitch_hz or 0.0, loudness_db, spectral_centroid_hz, pitch_jitter]])
        probabilities = self._model.predict_proba(features)[0]
        class_probabilities: Dict[str, float] = dict(zip(self._model.classes_, probabilities.tolist()))
        return (
            class_probabilities.get("scream", 0.0),
            class_probabilities.get("fear_distress", 0.0),
        )

    @staticmethod
    def _classify_with_fallback_thresholds(
        pitch_hz: Optional[float], loudness_db: float, spectral_centroid_hz: float, pitch_jitter: float, sr: int
    ) -> Tuple[float, float]:
        centroid_score = _normalize(spectral_centroid_hz, sr * 0.05, sr * 0.25)
        pitch_score = _normalize(pitch_hz, FALLBACK_SCREAM_PITCH_FLOOR_HZ, FALLBACK_SCREAM_PITCH_CEILING_HZ)
        loudness_score = _normalize(loudness_db, FALLBACK_SCREAM_LOUDNESS_FLOOR_DB, FALLBACK_SCREAM_LOUDNESS_CEILING_DB)
        scream_probability = float(np.clip(0.45 * pitch_score + 0.35 * loudness_score + 0.20 * centroid_score, 0.0, 1.0))

        jitter_score = _normalize(pitch_jitter, FALLBACK_FEAR_JITTER_FLOOR, FALLBACK_FEAR_JITTER_CEILING)
        fear_probability = float(np.clip(0.5 * jitter_score + 0.5 * loudness_score, 0.0, 1.0))
        return scream_probability, fear_probability

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


tone_analysis_service = ToneAnalysisService(settings.tone_classifier_path, settings.tone_classifier_metadata_path)
