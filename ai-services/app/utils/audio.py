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

import os
import shutil
import subprocess
import tempfile

from app.core.logging import logger


def transcode_to_wav_via_ffmpeg(audio_bytes: bytes, sample_rate: int = 16000) -> bytes:
    """
    Converts arbitrary input audio (m4a/aac/3gp/whatever) to 16-bit mono PCM WAV via ffmpeg.
    Requires `ffmpeg` on PATH (a system package, not a pip dependency).

    IMPORTANT — why this uses a temp file and NOT a stdin pipe:
    MP4/M4A files recorded by phones (iOS AVAudioRecorder, Android MediaRecorder) store their
    index (the `moov` atom) at the END of the file. ffmpeg cannot seek on a pipe, so decoding such
    a file from stdin fails with "partial file" — and, worse, still exits with code 0 and writes a
    near-empty WAV. The old pipe-based version therefore turned most real phone recordings into
    silence without raising any error. Reading from a seekable file fixes it.
    """
    if shutil.which("ffmpeg") is None:
        raise RuntimeError(
            "ffmpeg is not installed or not on PATH — required to decode compressed audio "
            "(m4a/aac/3gp). Install it in this service's runtime environment."
        )

    with tempfile.TemporaryDirectory(prefix="safesathi_audio_") as tmp:
        src = os.path.join(tmp, "in.bin")
        with open(src, "wb") as f:
            f.write(audio_bytes)
        process = subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src,
             "-f", "wav", "-ar", str(sample_rate), "-ac", "1", "pipe:1"],
            capture_output=True,
            check=False,
        )

    stderr = process.stderr.decode(errors="replace")[:500]
    # A valid WAV header alone is 44 bytes: anything this small means "decoded nothing", even with rc == 0.
    if process.returncode != 0 or len(process.stdout) < 1000:
        logger.error("ffmpeg transcode produced no audio (rc=%s, bytes=%s): %s", process.returncode, len(process.stdout), stderr)
        raise ValueError(f"ffmpeg could not decode this audio: {stderr or 'empty output'}")
    return process.stdout
