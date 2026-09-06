"""
Shared audio-decoding helpers.

Mobile devices don't produce raw WAV by default — iOS's AVAudioRecorder
and Android's MediaRecorder both default to compressed containers
(m4a/AAC being the practical, reliable cross-platform choice; see
mobile-app/README.md for why raw PCM WAV isn't a realistic on-device
recording target). Both services in this package need to turn whatever
the phone actually sends into 16-bit mono PCM WAV, so that conversion
lives here once instead of twice.
"""

from __future__ import annotations

import shutil
import subprocess

from app.core.logging import logger


def transcode_to_wav_via_ffmpeg(audio_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """
    Converts arbitrary input audio (m4a/aac/3gp/whatever) to 16-bit mono
    PCM WAV via ffmpeg over stdin/stdout pipes — no temp files. Requires
    `ffmpeg` on PATH (a system package, not a pip dependency: `apt-get
    install ffmpeg` or the platform equivalent in whatever deploys this
    service — see ai-services/README.md).

    Verified directly against a real AAC/M4A file during development —
    librosa's own audioread fallback does NOT reliably cover file-like
    (BytesIO) input on the version pinned in requirements.txt, so this
    exists rather than relying on that path silently failing.
    """
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "ffmpeg is not installed or not on PATH — required to decode compressed audio "
            "(m4a/aac/3gp). Install it in this service's runtime environment."
        )

    process = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error",
            "-i", "pipe:0",
            "-f", "wav", "-ar", str(sample_rate), "-ac", "1",
            "pipe:1",
        ],
        input=audio_bytes,
        capture_output=True,
        check=False,
    )
    if process.returncode != 0 or not process.stdout:
        stderr = process.stderr.decode(errors="replace")[:500]
        logger.error("ffmpeg transcode failed: %s", stderr)
        raise ValueError(f"ffmpeg could not decode this audio: {stderr}")
    return process.stdout
