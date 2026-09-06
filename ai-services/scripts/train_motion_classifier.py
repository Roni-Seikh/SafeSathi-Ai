"""
Trains the motion-event classifier on synthetic data.

No labeled real-world accelerometer/gyroscope dataset for
phone-snatch/violent-movement/sudden-fall exists to train on honestly —
collecting one safely is its own research project. This script instead
generates training examples from documented, physically-reasoned
per-class distributions (see CLASS_PROFILES below) so the classifier has
real, verifiable structure rather than being a fabricated black box, and
is explicit that it's a bootstrap pending real labeled data.

Run: python scripts/train_motion_classifier.py
Output: app/ml_artifacts/motion_classifier.joblib + a metadata JSON with
the feature order, class labels, and the test-set metrics this run
produced (so the numbers in ai-services/README.md are the actual output
of this script, not invented).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score, train_test_split

RANDOM_SEED = 42
SAMPLES_PER_CLASS = 600

FEATURE_NAMES = [
    "accel_mean",
    "accel_peak",
    "accel_variance",
    "accel_peak_to_mean",
    "gyro_mean",
    "gyro_peak",
    "gyro_variance",
    "gyro_peak_to_mean",
]

CLASS_LABELS = ["normal", "running", "phone_snatch", "violent_movement", "sudden_fall"]


@dataclass
class ClassProfile:
    """(mean, std) per feature, in the units SensorLog.model.ts uses:
    m/s^2 for accelerometer magnitude, rad/s for gyroscope magnitude."""

    accel_mean: tuple[float, float]
    accel_peak: tuple[float, float]
    accel_variance: tuple[float, float]
    gyro_mean: tuple[float, float]
    gyro_peak: tuple[float, float]
    gyro_variance: tuple[float, float]


# Rationale per class (see ai-services/README.md for the full writeup):
# - normal: near-gravity magnitude (~9.8 m/s^2), low variance, low gyro.
# - running: elevated mean + periodic variance from footstrike, moderate
#   gyro from arm swing.
# - phone_snatch: a short, very sharp acceleration+rotation spike — high
#   peak, high gyro peak (the twist as it's grabbed), but the *mean* isn't
#   pulled down the way a fall's is, since there's no free-fall phase.
# - violent_movement (struggling): sustained high variance and moderately
#   high peak on both sensors — not one clean spike like a snatch, closer
#   to continuous chaotic motion.
# - sudden_fall: very high peak (the impact) but a *lower* mean than the
#   sustained-high classes, because part of the window is a near-free-fall
#   dip (magnitude near 0) before impact — that peak-high/mean-low
#   combination is the distinguishing fall signature here, not peak alone.
CLASS_PROFILES: dict[str, ClassProfile] = {
    "normal": ClassProfile(
        accel_mean=(9.8, 0.6), accel_peak=(11.5, 1.2), accel_variance=(0.8, 0.4),
        gyro_mean=(0.15, 0.08), gyro_peak=(0.4, 0.15), gyro_variance=(0.05, 0.03),
    ),
    "running": ClassProfile(
        accel_mean=(13.0, 1.5), accel_peak=(18.0, 2.5), accel_variance=(3.0, 1.0),
        gyro_mean=(0.5, 0.15), gyro_peak=(1.0, 0.3), gyro_variance=(0.25, 0.1),
    ),
    "phone_snatch": ClassProfile(
        accel_mean=(12.0, 2.0), accel_peak=(32.0, 5.0), accel_variance=(6.0, 2.0),
        gyro_mean=(1.2, 0.4), gyro_peak=(6.5, 1.5), gyro_variance=(2.5, 0.8),
    ),
    "violent_movement": ClassProfile(
        accel_mean=(14.0, 2.5), accel_peak=(24.0, 4.0), accel_variance=(7.0, 2.0),
        gyro_mean=(1.8, 0.5), gyro_peak=(3.5, 1.0), gyro_variance=(1.8, 0.6),
    ),
    "sudden_fall": ClassProfile(
        accel_mean=(6.5, 1.8), accel_peak=(28.0, 5.0), accel_variance=(8.0, 2.5),
        gyro_mean=(0.8, 0.3), gyro_peak=(2.5, 0.8), gyro_variance=(1.0, 0.4),
    ),
}


def _sample_positive(rng: np.random.Generator, mean_std: tuple[float, float]) -> float:
    mean, std = mean_std
    return float(max(0.0, rng.normal(mean, std)))


def generate_dataset(samples_per_class: int, seed: int) -> tuple[np.ndarray, np.ndarray]:
    rng = np.random.default_rng(seed)
    rows: list[list[float]] = []
    labels: list[str] = []

    for label in CLASS_LABELS:
        profile = CLASS_PROFILES[label]
        for _ in range(samples_per_class):
            accel_mean = _sample_positive(rng, profile.accel_mean)
            accel_peak = max(accel_mean, _sample_positive(rng, profile.accel_peak))
            accel_variance = _sample_positive(rng, profile.accel_variance)
            gyro_mean = _sample_positive(rng, profile.gyro_mean)
            gyro_peak = max(gyro_mean, _sample_positive(rng, profile.gyro_peak))
            gyro_variance = _sample_positive(rng, profile.gyro_variance)

            rows.append(
                [
                    accel_mean,
                    accel_peak,
                    accel_variance,
                    accel_peak / accel_mean if accel_mean > 0 else 0.0,
                    gyro_mean,
                    gyro_peak,
                    gyro_variance,
                    gyro_peak / gyro_mean if gyro_mean > 0 else 0.0,
                ]
            )
            labels.append(label)

    return np.array(rows), np.array(labels)


def main() -> None:
    X, y = generate_dataset(SAMPLES_PER_CLASS, RANDOM_SEED)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_leaf=5,
        random_state=RANDOM_SEED,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    cv_scores = cross_val_score(clf, X, y, cv=5)
    cm = confusion_matrix(y_test, y_pred, labels=CLASS_LABELS)

    print("=== Test set classification report ===")
    print(classification_report(y_test, y_pred))
    print("=== 5-fold cross-validation accuracy ===")
    print(f"{cv_scores.mean():.4f} +/- {cv_scores.std():.4f}")
    print("=== Confusion matrix (rows=actual, cols=predicted) ===")
    print(CLASS_LABELS)
    print(cm)
    print("=== Feature importances ===")
    for name, importance in sorted(zip(FEATURE_NAMES, clf.feature_importances_), key=lambda p: -p[1]):
        print(f"  {name}: {importance:.4f}")

    artifacts_dir = Path(__file__).resolve().parent.parent / "app" / "ml_artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    import joblib

    model_path = artifacts_dir / "motion_classifier.joblib"
    joblib.dump(clf, model_path)

    metadata = {
        "feature_names": FEATURE_NAMES,
        "class_labels": CLASS_LABELS,
        "trained_on": "synthetic data — see docstring at the top of this script",
        "samples_per_class": SAMPLES_PER_CLASS,
        "test_accuracy": report["accuracy"],
        "cv_accuracy_mean": float(cv_scores.mean()),
        "cv_accuracy_std": float(cv_scores.std()),
        "per_class_f1": {label: report[label]["f1-score"] for label in CLASS_LABELS},
    }
    metadata_path = artifacts_dir / "motion_classifier_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2))

    print(f"\nSaved model to {model_path}")
    print(f"Saved metadata to {metadata_path}")


if __name__ == "__main__":
    main()
