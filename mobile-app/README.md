# SafeSathi Mobile App

React Native + Expo + TypeScript. See `docs/architecture/ARCHITECTURE.md`
for the full design and `docs/architecture/WIREFRAMES.md` for every screen.

## 1. Setup

```bash
npm install
```

Create `app.config.ts` (or edit `app.json`'s `expo.extra`) with:
```ts
extra: {
  apiBaseUrl: 'http://<your-machine-ip>:5000/api/v1', // not localhost — a physical device can't reach your laptop's localhost
  socketUrl: 'http://<your-machine-ip>:5000',
  firebaseApiKey: '...',
  firebaseAuthDomain: '...',
  firebaseProjectId: '...',
  firebaseStorageBucket: '...',
  firebaseMessagingSenderId: '...',
  firebaseAppId: '...',
}
```

These are the same Firebase project's **client-side** config values
(Firebase Console → Project Settings → General → Your apps), distinct from
the **server-side** service-account credentials the backend's `.env` uses.

For Android push notifications specifically, also drop a real
`google-services.json` (Firebase Console → Project Settings → your Android
app) at `mobile-app/google-services.json` — referenced in `app.json`.
Native FCM tokens only resolve correctly in a custom dev/production build,
not in Expo Go, since Expo Go's package name won't match your Firebase
Android app.

## 2. Run

```bash
npx expo start
```

Scan the QR code with Expo Go for everything except native push
notifications (see above), or run `npx expo run:android` / `run:ios` for a
full custom build.

Testing live location sharing needs two accounts: one triggers SOS (or
uses Share Live Location) with the other added as a linked emergency
contact — add the contact using the *exact* phone number that account
registered with, so the backend can resolve `linkedUserId` and the
Socket.IO authorization check passes.

Voice and motion detection need the AI service running too (see
`../ai-services/README.md`) — without it, `/voice-logs` and
`/sensor-logs` calls fail with `AI_SERVICE_UNAVAILABLE` and both
detectors just retry on the next window/segment. Before relying on voice
detection anywhere real: confirm on an actual device that a recorded
segment's metering triggers correctly and that the uploaded file plays
back as valid audio — that loop has not been exercised outside this
codebase's own logic.

## 3. What's implemented right now (Phases 3–6)

- **Auth** — Onboarding → Register/Login → Firebase phone-OTP verification
  → backend sync, all working end-to-end against the Phase 2 backend
- **Home** — SOS hold-to-trigger button (captures live location + battery,
  calls `POST /sos/trigger`), quick-action tiles including Share Live
  Location, and real "Listening" / "Motion monitoring" status badges
- **Profile** — Personal info, medical info, safety-preference toggles, all
  persisting via the real backend
- **Emergency Contacts** — list, add, edit, remove — capped at 5, matching
  the backend's enforcement
- **SOS Active screen** — resolve / false-alarm / "I'm Safe", plus
  **continuous foreground GPS streaming** to the backend for the duration
  of the alert
- **Live Location Sharing** — `ShareLocationScreen` (pick contacts,
  start/stop) and `ViewLiveLocationScreen` (the receiving side — live
  coordinates, battery, freshness, updated over Socket.IO in real time,
  with an "Open in Maps" deep link instead of an embedded map — see the
  note in that screen's file for why)
- **Push notifications** — native FCM device token registered
  automatically once signed in; tapping an SOS or location-share push
  opens the live-location viewer directly
- **On-device motion detection** (`useMotionDetector`) — windows
  accelerometer/gyroscope samples every 2s, and any window that clears a
  loose on-device threshold gets sent to the AI service's trained
  classifier; a confirmed danger signature above its own threshold
  auto-triggers SOS. Pure JS via `expo-sensors` — no native-build gap, so
  this one *is* exercised by the type-check the way everything else is.
- **On-device voice detection** (`useVoiceDetector`) — records rolling
  ~4s segments (m4a/AAC), checks each segment's peak volume locally, and
  only uploads segments that clear that bar for Vosk keyword spotting +
  tone analysis. **Not verified on a real device or simulator** — there
  isn't one in the build environment this was written in. The recording
  options are written against `expo-av`'s documented API but the actual
  file this produces, and its metering behavior, need a real smoke test
  before you rely on this — see the verification note at the top of
  `src/hooks/useVoiceDetector.ts`.
- Both detectors respect the Safety Preferences toggles in Settings, and
  both pause automatically while an SOS is already active.
- **Report an Incident** — type, description, optional photo (uploaded via
  signed Firebase Storage URL), anonymous toggle, current location
  attached automatically
- **Community Alerts** — nearby incidents in the last 24h, pull-to-view
  list (filing a report elsewhere also proactively pushes a notification
  to nearby opted-in users — see backend/README.md)
- **Safe Route** — search a destination (resolved via `expo-av`'s sibling
  `expo-location.geocodeAsync`, the OS's native geocoder — no API key
  needed, but like voice detection, not yet smoke-tested on a real
  device), get candidate routes ranked by SafeScore as a list, not a map
- **Risk Zones** — nearby heatmap cells as color-coded cards (green/
  yellow/red) with report/SOS counts, with a "Refresh for my area" button
- **Settings** — language display, safety preferences, log out, delete
  account, about

**Not yet implemented** (see `docs/planning/ROADMAP.md` for the phase each
ships in): true background execution when the app isn't foregrounded
(needs `expo-task-manager` wired to a native background task, plus an
Android foreground service for continuous mic access — a separately
testable, device-dependent piece of work), an embedded map component
(MapLibre — Phase 6, shared with Safe Route and the Heatmap), safe route,
heatmap, and the AI chatbot. The navigation shell is deliberately a single
stack rather than the bottom-tab layout in `WIREFRAMES.md` until Map and
Chat have real screens to show (Phase 6) — see the comment at the top of
`src/navigation/AppNavigator.tsx`.

## 4. Verifying changes

```bash
npx tsc --noEmit
```

Every file in this app has been type-checked against the real installed
Expo/React Native/React Navigation type definitions, not just visually
reviewed.
