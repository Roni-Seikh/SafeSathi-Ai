#!/usr/bin/env bash
#
# Downloads the Vosk models this service can actually use.
#
# English and Hindi: confirmed live downloads as of this writing.
# Bengali: NOT downloaded here — see the printed notice below.
#
set -euo pipefail

MODELS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/models"
mkdir -p "$MODELS_DIR"
cd "$MODELS_DIR"

download_and_extract() {
  local name="$1"
  local url="$2"
  local final_name="$3"
  if [ -d "$final_name" ]; then
    echo "✓ $final_name already present, skipping"
    return
  fi
  echo "Downloading $name..."
  curl -L -o "${name}.zip" "$url"
  unzip -q "${name}.zip"
  rm "${name}.zip"
  # The zip extracts to a versioned folder (e.g. vosk-model-small-en-us-0.15),
  # but .env.example and VoskKeywordService both expect the version-less
  # name below — rename so the configured VOSK_MODEL_PATH_* env vars
  # resolve without any further changes.
  mv "$name" "$final_name"
  echo "✓ $final_name ready at $MODELS_DIR/$final_name"
}

download_and_extract "vosk-model-small-en-us-0.15" \
  "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip" \
  "vosk-model-small-en-us"

download_and_extract "vosk-model-small-hi-0.22" \
  "https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip" \
  "vosk-model-small-hi"

cat <<'EOF'

────────────────────────────────────────────────────────────────────────
Bengali was NOT downloaded.

As of this writing, AlphaCephei's classic Kaldi-format small Bengali
model's download links are dead (see alphacep/vosk-api GitHub issue
#1961). Their current Bengali offering, vosk-model-small-streaming-bn,
uses a different inference engine (Zipformer2 / sherpa-onnx) that this
service's `vosk` package integration cannot load — VoskKeywordService
only speaks the classic Kaldi model format.

Options, in rough order of effort:
  1. Check https://alphacephei.com/vosk/models directly — if the classic
     link has been restored, add it above the same way as en/hi.
  2. Add a second engine specifically for Bengali using `sherpa-onnx`
     (same team, actively maintained, different Python package) behind
     the same VoskKeywordService.detect() interface, so callers don't
     change.
  3. Use a different offline STT engine for Bengali (e.g. a small
     Whisper model via whisper.cpp) as a one-off.

Until one of these lands, VoskKeywordService.is_available("bn") is False
and detect() for Bengali returns ("none", 0.0, None) rather than a wrong
guess.
────────────────────────────────────────────────────────────────────────
EOF
