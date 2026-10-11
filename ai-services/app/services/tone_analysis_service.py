from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from app.core.logging import logger
from app.core.settings import settings
from app.utils import audio_features as AF
from app.utils.audio import transcode_to_wav_via_ffmpeg

MIN_RMS_FOR_ANALYSIS = 1e-4  # below this the clip is silence — don't ask the model to guess


@dataclass
class ToneResult:
    pitch_hz: Optional[float]
    loudness_db: Optional[float]
    scream_probability: float
    fear_probability: float


class ToneAnalysisService:
    """Scores a clip for screaming using the model trained in notebooks/02_tone_classifier.ipynb.

    Feature extraction is `app/utils/audio_features.py` — the very module the notebook trained with.
    A clip is cut into 1.5 s windows; the clip's scream score is the MAX over windows, so a one-second
    scream inside a four-second clip is not diluted by the silence around it.

    `fear_probability` is the probability of a `fear_distress` class IF the model was trained with one
    (see notebook section 3b); otherwise it is 0.0.
    """

    def __init__(self, model_path: str, metadata_path: str) -> None:
        self._model = None
        self._feature_names: list[str] = []
        model_file, metadata_file = Path(model_path), Path(metadata_path)
        if not model_file.exists() or not metadata_file.exists():
            logger.warning("Tone classifier artifacts not found at %s — run notebooks/02_tone_classifier.ipynb. "
                           "Using a heuristic fallback.", model_path)
            return
        self._model = joblib.load(model_file)
        metadata = json.loads(metadata_file.read_text())
        self._feature_names = metadata["feature_names"]
        ev = metadata.get("evaluation", {})
        logger.info("Loaded tone classifier '%s' (held-out window macro-F1=%.3f)", metadata.get("model_name"), ev.get("window_macro_f1", float("nan")))

    @property
    def is_trained_model_loaded(self) -> bool:
        return self._model is not None

    def analyze(self, audio_bytes: bytes) -> ToneResult:
        y = self._decode(audio_bytes)
        if y.size == 0 or float(np.sqrt(np.mean(y ** 2))) < MIN_RMS_FOR_ANALYSIS:
            return ToneResult(None, None, 0.0, 0.0)

        loudness_db = AF.rms_db(y)
        X = AF.extract_clip_features(y)
        if len(X) == 0:
            return ToneResult(None, loudness_db, 0.0, 0.0)

        frame = pd.DataFrame(X, columns=AF.FEATURE_NAMES)
        f0 = frame["f0_median"].to_numpy()
        pitch = float(np.median(f0[f0 > 0])) if np.any(f0 > 0) else None

        if self._model is None:
            return ToneResult(pitch, loudness_db, self._heuristic(frame), 0.0)

        d = AF.add_ratio_features(frame)[self._feature_names].to_numpy()
        probs = self._model.predict_proba(d)
        classes = list(self._model.classes_)
        scream = float(probs[:, classes.index("scream")].max()) if "scream" in classes else 0.0
        fear = float(probs[:, classes.index("fear_distress")].max()) if "fear_distress" in classes else 0.0
        return ToneResult(pitch, loudness_db, scream, fear)

    @staticmethod
    def _heuristic(frame: pd.DataFrame) -> float:
        """Only used when no trained artifact exists: high pitch + strong HF energy."""
        pitch = np.clip((frame["f0_median"] - 400) / 800, 0, 1)
        hf = np.clip((frame["hf_ratio_2k"] - 0.1) / 0.4, 0, 1)
        return float((0.6 * pitch + 0.4 * hf).max())

    @staticmethod
    def _decode(audio_bytes: bytes) -> np.ndarray:
        try:
            y, _ = AF.load_audio(audio_bytes)
        except Exception as exc:  # phone m4a/aac/3gp — soundfile can't read it, so go through ffmpeg
            logger.info("soundfile couldn't read this container directly (%s); converting via ffmpeg", exc)
            y, _ = AF.load_audio(transcode_to_wav_via_ffmpeg(audio_bytes))
        return y


tone_analysis_service = ToneAnalysisService(settings.tone_classifier_path, settings.tone_classifier_metadata_path)
