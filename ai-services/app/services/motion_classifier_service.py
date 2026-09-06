from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict

import joblib
import numpy as np

from app.core.logging import logger
from app.core.settings import settings
from app.models.motion import MotionEventType, MotionSummary


@dataclass
class MotionClassificationResult:
    event_type: MotionEventType
    confidence: float
    class_probabilities: Dict[str, float]


class MotionClassifierService:
    """Wraps the RandomForest trained by scripts/train_motion_classifier.py.
    See that script's docstring for what it's trained on and why."""

    def __init__(self, model_path: str, metadata_path: str) -> None:
        self._model = None
        self._feature_names: list[str] = []
        self._class_labels: list[str] = []

        model_file = Path(model_path)
        metadata_file = Path(metadata_path)

        if not model_file.exists() or not metadata_file.exists():
            logger.warning(
                "Motion classifier artifacts not found at %s — run "
                "`python scripts/train_motion_classifier.py` first. Falling back "
                "to a fixed-threshold classifier until then.",
                model_path,
            )
            return

        self._model = joblib.load(model_file)
        metadata = json.loads(metadata_file.read_text())
        self._feature_names = metadata["feature_names"]
        self._class_labels = metadata["class_labels"]
        logger.info(
            "Loaded motion classifier (test_accuracy=%.3f, cv_accuracy=%.3f)",
            metadata.get("test_accuracy", float("nan")),
            metadata.get("cv_accuracy_mean", float("nan")),
        )

    @property
    def is_trained_model_loaded(self) -> bool:
        return self._model is not None

    def classify(self, accelerometer: MotionSummary, gyroscope: MotionSummary) -> MotionClassificationResult:
        if self._model is not None:
            return self._classify_with_model(accelerometer, gyroscope)
        return self._classify_with_fallback_thresholds(accelerometer, gyroscope)

    def _features(self, accelerometer: MotionSummary, gyroscope: MotionSummary) -> np.ndarray:
        accel_ratio = accelerometer.peak_magnitude / accelerometer.mean_magnitude if accelerometer.mean_magnitude else 0.0
        gyro_ratio = gyroscope.peak_magnitude / gyroscope.mean_magnitude if gyroscope.mean_magnitude else 0.0
        return np.array(
            [
                [
                    accelerometer.mean_magnitude,
                    accelerometer.peak_magnitude,
                    accelerometer.variance,
                    accel_ratio,
                    gyroscope.mean_magnitude,
                    gyroscope.peak_magnitude,
                    gyroscope.variance,
                    gyro_ratio,
                ]
            ]
        )

    def _classify_with_model(self, accelerometer: MotionSummary, gyroscope: MotionSummary) -> MotionClassificationResult:
        features = self._features(accelerometer, gyroscope)
        probabilities = self._model.predict_proba(features)[0]
        class_probabilities = dict(zip(self._model.classes_, probabilities.tolist()))
        best_label = max(class_probabilities, key=class_probabilities.get)
        return MotionClassificationResult(
            event_type=best_label,  # type: ignore[arg-type]
            confidence=class_probabilities[best_label],
            class_probabilities=class_probabilities,
        )

    @staticmethod
    def _classify_with_fallback_thresholds(
        accelerometer: MotionSummary, gyroscope: MotionSummary
    ) -> MotionClassificationResult:
        """Only used if the trained model artifact is missing. A crude
        safety net, not a substitute for running the training script."""
        if accelerometer.peak_magnitude > 25 and accelerometer.mean_magnitude < 9:
            label: MotionEventType = "sudden_fall"
        elif gyroscope.peak_magnitude > 5:
            label = "phone_snatch"
        elif accelerometer.variance > 5:
            label = "violent_movement"
        elif accelerometer.mean_magnitude > 11:
            label = "running"
        else:
            label = "normal"
        probs = {name: (0.5 if name == label else 0.125) for name in
                 ("normal", "running", "phone_snatch", "violent_movement", "sudden_fall")}
        return MotionClassificationResult(event_type=label, confidence=probs[label], class_probabilities=probs)


motion_classifier_service = MotionClassifierService(
    settings.motion_classifier_path, settings.motion_classifier_metadata_path
)
