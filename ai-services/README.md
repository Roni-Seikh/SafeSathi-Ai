# SafeSathi AI Services

Python + FastAPI internal microservice — voice keyword spotting, tone
analysis, motion classification, and SafeScore. Called by the Node
backend only (`AI_SERVICE_BASE_URL`); never exposed to the mobile app or
admin dashboard directly. See `docs/architecture/API_DESIGN.md §17`.

## 1. Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Train the motion classifier (required — the service falls back to a
crude threshold classifier without it, see §4):

```bash
python scripts/train_motion_classifier.py
```

Download the Vosk speech models (optional — tone analysis and motion
classification work without them; only keyword spotting needs them):

```bash
bash scripts/download_vosk_models.sh
```

Run:

```bash
uvicorn app.main:app --reload --port 8001
curl http://localhost:8001/health
```

## 2. Honest status: what's real here vs. what needs your own network access

Everything in this service was **actually run and verified** in the build
environment — not just written and assumed correct:

- **Tone analysis** (librosa) — tested against synthetic audio (pure
  tones, silence): pitch detection confirmed accurate to within 1Hz on a
  clean 500Hz test tone, loudness/scream/fear scores respond correctly to
  louder and higher-pitched input.
- **Motion classifier** (scikit-learn RandomForest) — actually trained in
  this environment. Real results from that run:
  - **97.7% test-set accuracy**, **97.5% ± 0.5% 5-fold cross-validation
    accuracy**
  - Confusion is concentrated between `phone_snatch` and
    `violent_movement` (the two deliberately-similar classes) — 4
    misconfusions out of 600 test samples, zero elsewhere
  - Feature importances: `accel_mean` and `accel_peak_to_mean` ratio
    dominate, which matches the design intent (see the training script's
    docstring — the peak/mean relationship is what distinguishes a fall's
    "spike after a low patch" from sustained violent shaking)
  - **This is trained on synthetic data**, not real accelerometer
    recordings — see `scripts/train_motion_classifier.py`'s docstring for
    the full reasoning. No labeled real-world dataset for
    phone-snatch/violent-movement/sudden-fall exists to train on
    honestly; the per-class distributions are physically-reasoned and
    documented, not arbitrary. Retraining on real labeled data once
    collected is a drop-in replacement — same script, same feature
    contract.
- **SafeScore** — implements `docs/architecture/SAFESCORE_ALGORITHM.md`'s
  formula exactly; verified a daytime/safe scenario (score 78) ranks
  above a night/low-battery/high-motion-anomaly scenario (score 15).
- **Vosk keyword spotting** — the integration code is real and correct
  (verified against the actual `vosk` package's API), but **no model
  files are downloaded in this environment** — `alphacephei.com` isn't
  reachable from here. Every endpoint was tested and confirmed to degrade
  gracefully (`keyword_engine_available: false`, `detected_keyword:
  "none"`) rather than crash or fake a result. Run
  `scripts/download_vosk_models.sh` wherever you do have network access
  to actually enable it.

## 3. The Bengali gap (read this before assuming it's a bug)

`scripts/download_vosk_models.sh` deliberately does **not** attempt to
download a Bengali model. Real, current findings (checked at build time):

- AlphaCephei's classic Kaldi-format small Bengali model's download links
  are dead — confirmed via an open upstream GitHub issue
  (`alphacep/vosk-api#1961`, July 2025) asking for a re-upload.
- Their current Bengali offering, `vosk-model-small-streaming-bn`, is a
  **different inference engine** (Zipformer2 / `sherpa-onnx`), which this
  service's `vosk` package integration cannot load — `VoskKeywordService`
  only speaks the classic Kaldi model format.

`VoskKeywordService.is_available("bn")` is `False` for this reason, and
`detect()` for Bengali returns `("none", 0.0, None)` — an honest "not
available," not a wrong guess. Options for closing this gap, in rough
order of effort, are listed in `scripts/download_vosk_models.sh`'s
printed output and `app/services/vosk_keyword_service.py`'s docstring:
check for a restored classic-model link, add a second `sherpa-onnx`-based
engine for Bengali specifically behind the same interface, or use a
different offline STT engine (e.g. `whisper.cpp`) for that one language.

## 4. Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service status, whether the motion classifier and each Vosk language loaded |
| POST | `/internal/voice/analyze` | Multipart: `language` (form field) + `audio` (WAV or m4a/AAC file) → keyword + tone analysis |
| POST | `/internal/motion/classify` | JSON: accelerometer + gyroscope summary stats → event type + confidence |
| POST | `/internal/safescore` | JSON: battery, motion confidence, optional geo factors → SafeScore 0–100 |
| POST | `/internal/safescore/batch` | JSON: a list of up to 500 scoring requests → a list of scores, one HTTP round trip |

**`/internal/safescore/batch` replaced the originally-planned separate
`/internal/saferoute` and `/internal/heatmap/recalculate` endpoints** —
both turned out to be "score N points with the same formula and rank/
aggregate the results," which the backend (which owns the MongoDB geo
queries feeding those scores) is better positioned to do than a second
specialized AI-service endpoint per feature. `RouteService` samples
points along candidate routes and calls this once per route;
`HeatmapService` scores every grid cell with real report/SOS activity in
one call. See `docs/architecture/API_DESIGN.md §17`.

## 5. Audio format

`/internal/voice/analyze` accepts **raw WAV or a compressed format like
m4a/AAC** — the realistic on-device recording format, since neither
iOS's `AVAudioRecorder` nor Android's `MediaRecorder` produces raw PCM
WAV by default, and m4a/AAC is the reliable cross-platform choice (see
`mobile-app/README.md`). Anything `soundfile` can't read directly is
transcoded to WAV via `ffmpeg` (`app/utils/audio.py`) before analysis.

**This requires `ffmpeg` on PATH** — a system package, not a pip
dependency:

```bash
apt-get install ffmpeg      # Debian/Ubuntu (Render's build image included)
brew install ffmpeg          # macOS
```

This was verified against a real AAC/M4A file during development, not
assumed — librosa's own fallback for non-native containers does **not**
reliably cover file-like (BytesIO) input on the librosa version pinned in
`requirements.txt`; an earlier version of this service silently relied on
that fallback and it did not actually work, which is why the explicit
ffmpeg step exists instead.

## 6. Why a heuristic for tone, and an ML model for motion

These use different techniques on purpose, not inconsistently:

- **Tone/scream detection** uses a documented signal-processing heuristic
  (pitch + loudness + spectral centroid) because pitch and loudness
  elevation under vocal stress are well-established, explainable acoustic
  correlates in voice-science literature, and no labeled
  "scream vs. not" audio dataset was available to train a classifier on
  honestly.
- **Motion classification** uses a trained RandomForest because the
  feature space (6 summary statistics + 2 derived ratios) and five target
  classes are exactly the kind of tabular, non-linear-boundary problem
  classical ML handles well, and — even bootstrapped on synthetic
  data — training a real, evaluable model here is more honest than a
  hand-tuned if/else chain dressed up as "AI," while still being fully
  retrainable on real data later without changing its interface.
