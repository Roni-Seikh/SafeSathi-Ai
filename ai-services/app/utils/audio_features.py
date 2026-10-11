"""
Shared acoustic feature extraction for SafeSathi's voice-distress model.

This ONE module is imported by both
  * notebooks/02_tone_classifier.ipynb   (training)  and
  * app/services/tone_analysis_service.py (serving)
so the model can never be fed different features in production than the
ones it was trained on ("train/serve skew").

Design decisions (all justified in the notebook):
  * Everything is resampled to 16 kHz mono and every analysis window is
    peak-normalised first. The training corpora were recorded/normalised
    at different gains, so *absolute* loudness would be a data-collection
    artefact rather than a scream cue; every feature below is therefore
    loudness-invariant. (Absolute loudness is still reported to the API
    and is used on-device as a cheap pre-gate.)
  * 1.5 s windows with 0.75 s hop: long enough to hold a pitch contour,
    short enough that one scream inside a 4 s clip dominates its window.
"""
from __future__ import annotations

import io
from typing import List, Tuple

import librosa
import numpy as np
import soundfile as sf

SR = 16000
WIN_S = 1.5
HOP_S = 0.75
MIN_WINDOW_RMS_DB = -50.0  # windows quieter than this (dBFS) are treated as silence

N_MFCC = 13
_BASE_NAMES = [
    "zcr_mean", "centroid_mean", "centroid_std", "bandwidth_mean", "rolloff85_mean",
    "flatness_mean", "flux_mean", "crest_factor", "f0_median", "f0_p90", "f0_cv",
    "voiced_ratio", "hf_ratio_2k", "hf_ratio_4k",
]
FEATURE_NAMES: List[str] = (
    _BASE_NAMES
    + [f"mfcc{i}_mean" for i in range(1, N_MFCC + 1)]
    + [f"mfcc{i}_std" for i in range(1, N_MFCC + 1)]
)


def load_audio(source) -> Tuple[np.ndarray, int]:
    """Path or raw bytes -> mono float32 at SR. WAV/FLAC/OGG via soundfile;
    anything else (m4a/aac/3gp from phones) is the caller's job to transcode
    (see app/utils/audio.py)."""
    if isinstance(source, (bytes, bytearray)):
        source = io.BytesIO(source)
    y, sr = sf.read(source, dtype="float32", always_2d=False)
    if y.ndim > 1:
        y = y.mean(axis=1)
    if sr != SR:
        y = librosa.resample(y, orig_sr=sr, target_sr=SR, res_type="soxr_hq")
    return y.astype(np.float32), SR


def rms_db(y: np.ndarray) -> float:
    rms = float(np.sqrt(np.mean(np.square(y)) + 1e-12))
    return 20.0 * np.log10(rms + 1e-12)


def split_windows(y: np.ndarray) -> List[np.ndarray]:
    """Overlapping windows; a clip shorter than one window becomes one
    zero-padded window. Silent windows are dropped."""
    win, hop = int(WIN_S * SR), int(HOP_S * SR)
    if len(y) < win:
        y = np.pad(y, (0, win - len(y)))
    out = []
    for start in range(0, len(y) - win + 1, hop):
        w = y[start:start + win]
        if rms_db(w) > MIN_WINDOW_RMS_DB:
            out.append(w)
    return out


def window_features(w: np.ndarray) -> np.ndarray:
    peak = float(np.max(np.abs(w))) + 1e-9
    w = (w / peak).astype(np.float32)  # loudness invariance

    n_fft, hop = 512, 160
    S = np.abs(librosa.stft(w, n_fft=n_fft, hop_length=hop)) + 1e-10
    power = S ** 2

    zcr = librosa.feature.zero_crossing_rate(w, frame_length=n_fft, hop_length=hop)[0]
    centroid = librosa.feature.spectral_centroid(S=S, sr=SR)[0]
    bandwidth = librosa.feature.spectral_bandwidth(S=S, sr=SR)[0]
    rolloff = librosa.feature.spectral_rolloff(S=S, sr=SR, roll_percent=0.85)[0]
    flatness = librosa.feature.spectral_flatness(S=S)[0]
    flux = np.sqrt(np.sum(np.diff(S, axis=1).clip(min=0) ** 2, axis=0))
    rms = np.sqrt(np.mean(w ** 2)) + 1e-9
    crest = peak / (np.sqrt(np.mean((w * peak) ** 2)) + 1e-9)

    # Pitch: yin is ~50x faster than pyin and accurate enough for a
    # distributional summary. Voicing = tonal frames (low spectral flatness).
    f0 = librosa.yin(w, fmin=80, fmax=2000, sr=SR, frame_length=1024, hop_length=hop)
    n = min(len(f0), len(flatness))
    tonal = flatness[:n] < 0.2
    voiced_f0 = f0[:n][tonal]
    if voiced_f0.size >= 3:
        f0_med = float(np.median(voiced_f0))
        f0_p90 = float(np.percentile(voiced_f0, 90))
        f0_cv = float(np.std(voiced_f0) / (np.mean(voiced_f0) + 1e-9))
    else:
        f0_med = f0_p90 = f0_cv = 0.0
    voiced_ratio = float(np.mean(tonal)) if n else 0.0

    freqs = librosa.fft_frequencies(sr=SR, n_fft=n_fft)
    total = power.sum() + 1e-12
    hf2 = float(power[freqs >= 2000].sum() / total)
    hf4 = float(power[freqs >= 4000].sum() / total)

    mfcc = librosa.feature.mfcc(S=librosa.power_to_db(librosa.feature.melspectrogram(S=power, sr=SR, n_mels=40)),
                                n_mfcc=N_MFCC + 1)[1:]
    base = [
        float(zcr.mean()), float(centroid.mean()), float(centroid.std()), float(bandwidth.mean()),
        float(rolloff.mean()), float(flatness.mean()), float(flux.mean()), float(crest),
        f0_med, f0_p90, f0_cv, voiced_ratio, hf2, hf4,
    ]
    return np.array(base + mfcc.mean(axis=1).tolist() + mfcc.std(axis=1).tolist(), dtype=np.float64)


def extract_clip_features(y: np.ndarray) -> np.ndarray:
    """(n_windows, n_features). Empty array if the clip is entirely silent."""
    windows = split_windows(y)
    if not windows:
        return np.empty((0, len(FEATURE_NAMES)))
    return np.vstack([window_features(w) for w in windows])


RATIO_FEATURES = ["f0_to_centroid", "hf_to_lf_ratio", "bandwidth_to_centroid"]


def add_ratio_features(df):
    """Adds the three engineered ratio columns to a DataFrame holding FEATURE_NAMES.
    Shared by the notebook and the service so both compute them identically."""
    d = df.copy()
    eps = 1e-9
    d["f0_to_centroid"] = d["f0_median"] / (d["centroid_mean"] + eps)
    d["hf_to_lf_ratio"] = d["hf_ratio_2k"] / (1 - d["hf_ratio_2k"] + eps)
    d["bandwidth_to_centroid"] = d["bandwidth_mean"] / (d["centroid_mean"] + eps)
    return d
