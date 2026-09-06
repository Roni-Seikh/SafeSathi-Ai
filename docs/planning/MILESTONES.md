# SafeSathi — Milestones

Each milestone is only marked complete when its acceptance criteria are
demonstrably true — not when the corresponding phase's code has merely
been written.

## M1 — Architecture Finalized & Repository Scaffolded
*(End of Phase 1)*
- [x] Monorepo structure created for all 4 services
- [x] All 12 MongoDB collections modeled as Mongoose schemas with types, validation, and indexes
- [x] Full REST API surface documented (`API_DESIGN.md`)
- [x] ER diagram, wireframes, SafeScore formula documented
- [x] Roadmap, milestones, git strategy, dependency list agreed

## M2 — Backend Core Complete
*(End of Phase 2)*
- [x] Backend foundation: validated env config, MongoDB connection with retry, Firebase Admin init, structured logging, centralized error handling, tiered rate limiting (SOS routes exempted from throttling)
- [x] Firebase ID token verification middleware protects all end-user routes; separate JWT auth protects `/admin/*`
- [x] Auth, user profile, emergency contacts (max 5, auto-linked to a SafeSathi account by phone), notifications, and admin login fully implemented against real repository/service/controller layers
- [x] SOS trigger → notify-contacts pipeline is real end-to-end: creates the `SOSLog`, pushes via FCM to linked contacts, falls back to the SMS gateway for unlinked ones, records delivery per contact
- [x] Full backend type-checks cleanly (`tsc --noEmit`) against the real dependency versions
- [ ] Voice-logs, sensor-logs, reports, community alerts, safe-route, heatmap, and chat endpoints — these are built in Phases 5–6 alongside the AI service that gives them real behavior, not stubbed ahead of it
- [ ] Admin user/report/heatmap/export management — built in Phase 7 alongside the dashboard UI that consumes it

## M3 — Mobile App MVP
*(End of Phase 3)*
- [x] User can complete onboarding → register → OTP verify → land on Home Dashboard
- [x] Profile (personal + medical info) is editable and persists via the backend
- [x] Safety-preference toggles persist via the backend
- [x] Emergency contacts — add/edit/remove, capped at 5, enforced by the backend
- [x] SOS — hold-to-trigger button captures live location + battery and calls the real backend; SOS Active screen supports resolve/false-alarm/"I'm Safe"
- [x] Reusable component library in place (buttons, cards, loading skeletons, error/empty states, toggle rows, the SOS hold button)
- [x] Full app type-checks cleanly (`tsc --noEmit`) against the real installed Expo/React Native dependency versions
- [ ] Bottom-tab navigation shell (Home/Map/Chat/Profile) — currently a single stack; the Map and Chat tabs are added in Phases 5–6 once those screens have real content, per `src/navigation/AppNavigator.tsx`
- [ ] Push-notification token registration and continuous live-location sharing — Phase 4

## M4 — SOS End-to-End
*(End of Phase 4)*
- [x] User can add up to 5 emergency contacts (6th is rejected)
- [x] Manual SOS trigger creates an `SOSLog`, **automatically starts live location sharing** with linked contacts, and notifies all contacts via push (SMS-gateway fallback for unlinked ones)
- [x] "I'm Safe" / resolve / false-alarm close the active SOS, stop location sharing, and notify contacts
- [x] A linked contact can open a live-location view and see the sharer's position update in real time over a Socket.IO channel, authenticated the same way as REST (Firebase ID token)
- [x] Live location sharing also works standalone, outside of an SOS — "Share Live Location" on Home, pick contacts, start/stop
- [x] Push notification tokens (native FCM, not Expo push tokens — needed since the backend sends via firebase-admin directly) register automatically once signed in, and tapping an SOS/location-share push opens the live-location view
- [x] Both backend and mobile type-check cleanly with the full Phase 4 changes
- [ ] An embedded map (MapLibre) on the live-location screens — Phase 6 builds one shared map component for this, Safe Route, and the Heatmap together, since MapLibre needs a custom native build either way

## M5 — AI Detection Wired to Auto-SOS
*(End of Phase 5)*
- [x] Vosk correctly spots the required keyword set in English and Hindi on recorded test clips — **integration verified end-to-end via FastAPI TestClient**; models themselves aren't downloaded in the build environment (no network access to alphacephei.com there), so this is verified as "loads and matches correctly when a model is present," not "confirmed against real speech" — that's a one-command step (`ai-services/scripts/download_vosk_models.sh`) for whoever runs this with network access
- [x] Bengali is honestly reported unavailable rather than silently wrong — see `ai-services/README.md §3` for why (upstream model gap, not a bug here)
- [x] librosa-based tone analysis flags scream/fear patterns — verified against synthetic test audio (pitch detection accurate to ~1Hz on a clean tone; scores respond correctly to loudness/pitch changes)
- [x] Motion classifier distinguishes normal movement from phone-snatch/violent-movement/sudden-fall — **actually trained and evaluated**: 97.7% test accuracy, 97.5%±0.5% cross-validation accuracy, confusion concentrated only between the two deliberately-similar classes (phone_snatch/violent_movement)
- [x] Any of voice keyword, scream, or motion signature, above its confidence threshold, triggers the same auto-SOS pipeline as a manual trigger — `VoiceLogService`/`SensorLogService` call `SOSService.trigger()` directly, not a separate code path
- [x] Backend type-checks cleanly with the full Phase 5 integration (`tsc --noEmit`)
- [x] Mobile on-device detectors built: `useMotionDetector` (accelerometer/gyroscope windowing, pure JS, fully type-checked and exercised) and `useVoiceDetector` (segmented recording with local amplitude pre-filtering); both call the real `/voice-logs`/`/sensor-logs` endpoints, respect the Settings toggles, and pause while an SOS is already active
- [x] A real ffmpeg-decoding bug in the AI service was caught and fixed by actually testing with M4A audio (the format phones really produce) instead of assuming WAV-only input would be sufficient — see `ai-services/app/utils/audio.py`
- [ ] Real-world audio/sensor validation — the classifier's synthetic training data and the tone heuristic's thresholds are documented, reasoned starting points, not tuned against real recordings; retraining/re-tuning on real data is a drop-in replacement behind the same interfaces, not a redesign
- [ ] On-device voice detection has not been smoke-tested on a real device/simulator — no such device was available in this build environment; this is the one piece in Phase 5 verified by code review and API-contract correctness rather than actually running it
- [ ] True background execution (app not foregrounded) — both detectors currently run only while the app is open; background needs `expo-task-manager` + an Android foreground service, scoped as a separate follow-up

## M6 — Safe Route & Heatmap Live
*(End of Phase 6)*
- [x] Given origin/destination, the backend returns 2 candidate routes with genuinely distinct SafeScores when nearby report/SOS density differs between them — verified the scoring math end-to-end (both in the AI service directly and via the backend's `RouteService`); candidate route *geometry* is a documented straight-line simplification pending a real routing engine (OSRM/GraphHopper), not road-snapped paths
- [x] Heatmap zones (green/yellow/red) compute from real report/SOS data — a fixed-degree grid aggregation, not synthetic
- [x] Heatmap recalculates on-demand, scoped to a bounding box, by any authenticated user for their own visible map area; a broader admin-triggered global recalculation is Phase 7 territory (the admin dashboard that would trigger and monitor it doesn't exist yet)
- [x] Filing a report proactively notifies nearby opted-in users (push), not just a pull-based alerts list
- [x] Backend type-checks cleanly with the full Phase 6 addition (`tsc --noEmit`)
- [x] Mobile has real screens for all four features (Report Incident, Community Alerts, Safe Route, Risk Zones), wired to the live backend — list/badge-based UI, not a map
- [ ] Rendering any of this on an actual map (MapLibre) — deferred as its own follow-up; the data layer and UI are ready for it, this is purely the visual layer

## M7 — Admin Dashboard Functional
*(End of Phase 7)*
- [x] Admin can log in (JWT) and the API to verify/reject reports exists and updates the same `Report` documents the mobile app reads — a verified/rejected report is immediately reflected there, no separate sync needed since it's the same database
- [x] Backend supports listing live + historical SOS events, any status, any user — the data a real-time monitor view would poll or subscribe to
- [x] Analytics endpoints (overview, SOS/day trend, peak timings by hour) compute from real aggregated MongoDB data, not mocked numbers
- [x] CSV export produces valid RFC 4180 output for users/reports/SOS logs — verified the escaping logic directly (commas, quotes, and embedded newlines all round-trip correctly)
- [x] Role-gating is real: `analyst` admins can read everything but the mutating endpoints (deactivate a user, verify/reject, recalculate heatmap) require `super_admin` or `moderator`
- [x] Backend type-checks cleanly with the full Phase 7 addition (`tsc --noEmit`)
- [ ] The admin dashboard **frontend** (React + Vite + Tailwind) that actually presents any of this — not yet built; this milestone's backend half is done, the UI half is the next continuation
- [ ] "Live" SOS monitor updating in real time specifically — the backend endpoint is polling-ready today; wiring it to the existing Socket.IO server (already built for live location in Phase 4) for a push-updated view is frontend-phase work

## M8 — QA Sign-Off
*(End of Phase 8)*
- [ ] Unit test coverage for all service-layer business logic
- [ ] API/integration tests cover every endpoint's happy path + at least one failure path
- [ ] Error-handling tests confirm the standard error envelope for auth, validation, and not-found cases
- [ ] No known critical/high-severity bugs open

## M9 — Documentation Package Delivered
*(End of Phase 9)*
- [ ] SRS, Synopsis, and full Project Report complete
- [ ] Use-case and sequence diagrams cover every major module
- [ ] Installation, deployment, testing, and developer guides are each independently followable
- [ ] User manual covers every end-user feature with screenshots

## M10 — Deployed & Demo-Ready
*(End of Phase 10)*
- [ ] Backend live on Render, admin dashboard live on Vercel, database on a production MongoDB Atlas cluster, Firebase project in production mode
- [ ] Mobile app installable via an Expo/EAS build (APK or TestFlight/internal track)
- [ ] End-to-end smoke test passes against the deployed environment, not just localhost
