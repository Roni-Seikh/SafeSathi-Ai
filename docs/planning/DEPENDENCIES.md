# SafeSathi — Dependency List

Full dependency manifests live in each service's `package.json` /
`requirements.txt`. This is the human-readable "why" behind each choice.

## Backend (`backend/package.json`)

| Package | Purpose |
|---|---|
| `express` | HTTP server / routing |
| `mongoose` | MongoDB ODM, schema validation |
| `cors` | Cross-origin requests from mobile app + admin dashboard |
| `helmet` | Secure HTTP headers |
| `express-rate-limit` | Per-IP/per-user throttling |
| `dotenv` | Load `.env` into `process.env` |
| `jsonwebtoken` | Sign/verify admin JWTs |
| `firebase-admin` | Verify Firebase ID tokens, send FCM, manage Storage |
| `zod` | Request validation schemas |
| `winston` | Structured application logging |
| `morgan` | HTTP access logging (piped into winston) |
| `multer` | Multipart form parsing (fallback path for small uploads) |
| `compression` | gzip response compression |
| `socket.io` | Real-time live-location channel |
| `axios` | Backend → `ai-services` internal HTTP calls |
| `typescript`, `ts-node-dev` | Dev-time TS execution + hot reload |
| `jest`, `ts-jest`, `supertest` | Unit + API testing (Phase 8) |
| `eslint`, `@typescript-eslint/*`, `prettier` | Lint/format |

## Mobile App (`mobile-app/package.json`)

| Package | Purpose |
|---|---|
| `expo` | Managed React Native workflow, OTA updates, EAS build |
| `react`, `react-native` | Core framework |
| `@reduxjs/toolkit`, `react-redux` | Global state (auth, SOS, location, contacts...) |
| `@react-navigation/*` | Stack + bottom-tab navigation |
| `firebase` | Client SDK — Auth (OTP/email login), Storage uploads, FCM |
| `axios` | Backend API client |
| `expo-location` | GPS access, foreground + background location |
| `expo-sensors` | Accelerometer/gyroscope access for motion detection |
| `expo-av` | Microphone recording for voice keyword/tone detection, fake-call audio |
| `expo-camera` | Silent evidence photo capture |
| `expo-notifications` | Push notification handling |
| `expo-secure-store` | Secure local storage of the Firebase ID token |
| `expo-task-manager`, `expo-background-fetch` | Background execution for always-listening detection |
| `@maplibre/maplibre-react-native` | OpenStreetMap-tile map rendering |
| `lottie-react-native` | Onboarding/splash animations |
| `react-native-svg` | Icons, SafeScore gauge |
| `socket.io-client` | Live-location real-time channel |
| `zod` | Client-side form validation, mirrors backend schemas |
| `typescript` | Type safety across the app |
| `jest`, `jest-expo` | Component/unit testing (Phase 8) |

## AI Services (`ai-services/requirements.txt`)

| Package | Purpose |
|---|---|
| `fastapi` | Async API framework for the AI microservice |
| `uvicorn[standard]` | ASGI server |
| `pydantic`, `pydantic-settings` | Request/response schemas + typed config |
| `vosk` | Offline speech-to-text for keyword spotting (en/hi/bn) |
| `librosa` | Audio feature extraction — pitch, loudness, tone |
| `numpy`, `scipy` | Numerical backbone for signal processing and the motion classifier |
| `soundfile` | Audio file I/O |
| `python-multipart` | Multipart audio upload parsing |
| `python-dotenv` | Load `.env` in local dev |
| `motor` | Async MongoDB driver (reads logs, writes heatmap/route results) |
| `httpx` | Async HTTP calls back to the backend |
| `scikit-learn` | Lightweight motion-event classifier (accelerometer/gyroscope features) |

## Admin Dashboard (`admin-dashboard/package.json`)

| Package | Purpose |
|---|---|
| `react`, `react-dom` | Core framework |
| `react-router-dom` | Page routing |
| `@reduxjs/toolkit`, `react-redux` | State management |
| `axios` | Backend API client with JWT interceptor |
| `recharts` | Analytics charts (SOS/day, peak timings) |
| `maplibre-gl` | Heatmap and live-SOS map rendering |
| `react-hook-form` | Form handling (report review, user management) |
| `zod` | Form + response validation |
| `jwt-decode` | Read JWT expiry client-side to prompt re-login |
| `vite`, `@vitejs/plugin-react` | Dev server + build tooling |
| `tailwindcss`, `postcss`, `autoprefixer` | Styling |
| `typescript` | Type safety |

## Why not X?

- **REST over GraphQL** — the API surface is well-defined and
  resource-oriented; REST keeps the mobile app's offline/retry logic
  (critical for an SOS feature) simpler than a GraphQL client layer.
- **Firebase Auth over a custom auth system** — password storage, OTP
  delivery, and session security are exactly the kind of thing not worth
  re-implementing for a safety-critical login flow.
- **Vosk over cloud speech APIs** — needs to work with poor/no connectivity
  and without sending continuous audio to a third party; Vosk runs
  offline and supports the required languages.
- **MapLibre + OpenStreetMap over Google Maps SDK** — no API billing
  dependency for an academic project, and OSM's tagged road data
  (`lit=yes/no`, road class) directly feeds the SafeScore formula.
