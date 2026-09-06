# SafeSathi — API Design

Base URL: `https://api.safesathi.app/api/v1` (production) /
`http://localhost:5000/api/v1` (development)

## Implementation Status

| Status | Meaning |
|---|---|
| ✅ Live | Implemented in `backend/src/` against real repository/service/controller layers, type-checked |
| ⏳ Planned | Designed below; built in the phase noted, alongside the piece that gives it real behavior (the AI service, or the admin dashboard UI) |

| Module | Status | Built in |
|---|---|---|
| Auth (§2) | ✅ Live | Phase 2 |
| Users (§3) | ✅ Live | Phase 2 |
| Emergency Contacts (§4) | ✅ Live | Phase 2 |
| SOS (§5) | ✅ Live | Phase 2 |
| Location (§6) | ✅ Live | Phase 4 |
| Voice Detection (§7) | ✅ Live | Phase 5 |
| Motion Detection (§8) | ✅ Live | Phase 5 |
| Safe Route (§9) | ✅ Live | Phase 6 — candidate geometry is a documented straight-line simplification, not real road routing; scoring is real (see `backend/src/services/route.service.ts`) |
| Risk Heatmap (§10) | ✅ Live | Phase 6 — aggregated from real Report/SOSLog data |
| Reports (§11) | ✅ Live | Phase 6 |
| Community Alerts (§12) | ✅ Live | Phase 6 — proactive push on report creation, not just a pull endpoint |
| AI Chatbot (§13) | ⏳ Planned | Deferred with Phase 6 (needs the RAG service — not part of Phase 5's title scope, "Vosk, tone detection, motion detection") |
| Fake Call (§14) | ⏳ Planned | Phase 4 |
| Admin (§15) | ✅ Live | Auth in Phase 2; management endpoints in Phase 7. Admin dashboard *frontend* to consume this is a separate follow-up. |
| Notifications (§16) | ✅ Live | Phase 2 |
| Internal AI Service API (§17) | ✅ Live | Phase 5–6. Consolidated to `/internal/voice/analyze`, `/internal/motion/classify`, `/internal/safescore`, and `/internal/safescore/batch` — the originally-planned separate `/internal/saferoute`, `/internal/heatmap/recalculate`, and `/internal/chat` were folded into the batch endpoint or deferred; see `ai-services/README.md §4` |

Everything below is implemented in the phase noted here — this document
was written in Phase 1 as the contract, and stays the source of truth as
each module ships.

## 1. Conventions

- **Auth header (end users):** `Authorization: Bearer <firebase-id-token>`
- **Auth header (admins):** `Authorization: Bearer <jwt>`
- **Content type:** `application/json`, except file uploads
  (`multipart/form-data`) and evidence uploads, which use Firebase
  Storage signed URLs obtained from the backend rather than passing binary
  through the API.
- **Pagination:** `?page=1&limit=20`, response includes a `meta` block
  (`page`, `limit`, `total`, `totalPages`).
- **Standard success envelope:**
  ```json
  {
    "success": true,
    "data": { "...": "..." },
    "meta": { "page": 1, "limit": 20, "total": 42 }
  }
  ```
- **Standard error envelope:**
  ```json
  {
    "success": false,
    "error": {
      "code": "SOS_CONTACT_LIMIT_EXCEEDED",
      "message": "You can have at most 5 emergency contacts.",
      "details": null
    }
  }
  ```
- **Rate limiting:** default 100 req/15min per user (`express-rate-limit`).
  `POST /sos/*` and `POST /voice-logs`, `POST /sensor-logs` are exempt from
  aggressive throttling — these must never be the reason an emergency
  signal is dropped.

## 2. Auth (`/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Firebase ID token | Create the `User` document after Firebase sign-up completes on-device |
| POST | `/auth/login` | Firebase ID token | Verify token, return the `User` profile (login is otherwise handled entirely by the Firebase SDK client-side) |
| POST | `/auth/refresh-profile` | Firebase ID token | Re-sync profile after a Firebase-side change (e.g. phone re-verification) |
| POST | `/auth/logout` | Firebase ID token | Invalidate stored FCM token for this device |
| DELETE | `/auth/account` | Firebase ID token | Deactivate account (soft delete) |

OTP send/verify and forgot-password are handled by the Firebase Auth SDK
directly on the client (Firebase Phone Auth + Firebase password-reset
email) — see `ARCHITECTURE.md §4`.

## 3. Users (`/users`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/me` | Get current user's full profile |
| PATCH | `/users/me` | Update personal info (name, DOB, gender, address, language) |
| PATCH | `/users/me/medical-info` | Update blood group, allergies, conditions, medications |
| PATCH | `/users/me/safety-preferences` | Toggle voice/motion/tone detection, auto-SOS, silent evidence |
| POST | `/users/me/avatar` | Get a signed Firebase Storage upload URL for profile photo |
| POST | `/users/me/fcm-token` | Register/refresh this device's FCM push token |

## 4. Emergency Contacts (`/contacts`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/contacts` | List the user's emergency contacts (max 5) |
| POST | `/contacts` | Add a contact — rejects with `SOS_CONTACT_LIMIT_EXCEEDED` beyond 5 |
| PATCH | `/contacts/:id` | Update a contact (priority, notify preferences) |
| DELETE | `/contacts/:id` | Remove a contact |

## 5. SOS (`/sos`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/sos/trigger` | Manually trigger SOS (button press) |
| GET | `/sos/active` | Get the user's currently active SOS event, if any |
| GET | `/sos/history` | Paginated SOS history |
| PATCH | `/sos/:id/resolve` | Mark an SOS as resolved |
| PATCH | `/sos/:id/false-alarm` | Mark an SOS as a false alarm (also feeds AI detection tuning) |
| POST | `/sos/im-safe` | Send "I'm Safe" notification to all contacts, closes any active SOS |

## 6. Location (`/location`)

Live updates also stream over a **Socket.IO** channel, authenticated the
same way as REST — the client passes a Firebase ID token via the socket
handshake's `auth` payload, not a header. Viewers join room
`location:<sharerUserId>` via a `location:watch` event (server-side
authorization checked against `User.locationSharing`, identical to what
`GET /location/live/:userId` checks); the sharer's `POST /location` calls
emit `location:update` to that room. See
`backend/src/realtime/socketServer.ts`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/location` | Submit a location point (also used for live-sharing stream via REST fallback) |
| GET | `/location/live/:userId` | Get a shared user's current live location (only if actively shared with the requester) |
| POST | `/location/sharing/start` | Start live-sharing with selected contacts |
| POST | `/location/sharing/stop` | Stop live-sharing |
| GET | `/location/history` | Paginated location history for the current user |

Live streaming during an active share also happens over a `socket.io`
channel (`location:<userId>`), documented in `ARCHITECTURE.md §10`.

## 7. Voice Detection (`/voice-logs`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/voice-logs` | Submit a detected keyword/tone event from the on-device detector |
| GET | `/voice-logs` | Paginated history for the current user |

## 8. Motion Detection (`/sensor-logs`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/sensor-logs` | Submit a classified motion event from the on-device detector |
| GET | `/sensor-logs` | Paginated history for the current user |

## 9. Safe Route (`/routes`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/routes/safe-route` | Given origin + destination, returns candidate routes ranked by SafeScore (see `RouteService`'s scope note — candidate geometry is a straight-line simplification, not real road routing; the scoring itself is real) |
| GET | `/routes/history` | Paginated route request history |

## 10. Risk Heatmap (`/heatmap`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/heatmap?bbox=minLng,minLat,maxLng,maxLat` | Get heatmap zones within a bounding box |
| POST | `/heatmap/recalculate` | Recompute zones within a bounding box (body: `{ bbox }`) from current Report/SOSLog data — any authenticated user can refresh their own visible map area (bbox capped at ~20km per side); the broader admin-triggered full recalculation is a separate Phase 7 capability |

## 11. Reports (`/reports`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/reports` | File an incident report (optionally anonymous) — also proactively notifies nearby opted-in users, see §12 |
| GET | `/reports/me` | Paginated list of the current user's reports |
| GET | `/reports/:id` | Get a single report |
| POST | `/reports/:id/images` | Get a signed upload URL for a report image |
| PATCH | `/reports/:id/images` | Confirm an uploaded image (body: `{ imagePath }`), appends it to the report |

Admin verification endpoints live under `/admin/reports` (§15, Phase 7).

## 12. Community Alerts (`/community`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/community/alerts?lat=..&lng=..&radiusMeters=..` | Pull nearby alerts (last 24h), radius defaults to 800m |
| POST | `/community/alerts/subscribe` | Opt in/out of proximity push alerts (body: `{ enabled }`) |

Alerts are also **pushed proactively**: filing a report notifies every
opted-in user within `COMMUNITY_ALERT_RADIUS_METERS` of their last known
location — the pull endpoint above is for browsing, not the only way
alerts reach someone.

## 13. AI Chatbot (`/chat`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/chat/message` | Send a message, get a RAG-grounded response (women's rights, legal help, emergency numbers, self-defense) |
| GET | `/chat/history/:sessionId` | Get a session's chat history |
| DELETE | `/chat/history/:sessionId` | Clear a session |

## 14. Fake Call (`/fake-call`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/fake-call/voice` | Get a signed upload URL to save a custom caller voice recording |
| POST | `/fake-call/trigger` | Server-side log of a triggered fake call (for the SafeScore/analytics signal — the ringtone/UI itself is entirely local to the app) |

## 15. Admin (`/admin`) — separate JWT auth

**Status: ✅ Live (Phase 7 backend).** Role-gated: read-only endpoints
(analytics, listings, export) work for any active admin; mutating ones
(deactivate a user, verify/reject a report, recalculate the heatmap)
require `super_admin` or `moderator` — an `analyst` admin can see
everything but can't act on it. See `requireAdminRole` in
`backend/src/middlewares/adminAuth.middleware.ts`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/auth/login` | Admin login, returns JWT |
| GET | `/admin/analytics/overview` | Dashboard summary (SOS today, active users, pending reports...) |
| GET | `/admin/analytics/sos-trend?days=` | SOS count per day (for charting) |
| GET | `/admin/analytics/peak-timings?days=` | SOS + report count by hour-of-day |
| GET | `/admin/users?page=&limit=&search=` | Paginated user management list, search by name/email/phone |
| PATCH | `/admin/users/:id/status` | Activate/deactivate a user (`{ isActive }`) |
| GET | `/admin/reports?status=` | Paginated report queue (filter by status) |
| PATCH | `/admin/reports/:id/verify` | Verify a pending report |
| PATCH | `/admin/reports/:id/reject` | Reject a pending report (`{ reason }`) |
| GET | `/admin/sos?status=` | Live + historical SOS log view, every user |
| GET | `/admin/heatmap?page=&limit=` | Every calculated zone, riskiest first, no bounding box required |
| POST | `/admin/heatmap/recalculate` | Recompute zones for a bounding box (`{ bbox }`) — admin's box can be ~150km/side vs a regular user's ~20km |
| GET | `/admin/export/csv?type=users\|reports\|sos` | CSV download of the given collection |
| GET | `/admin/export/monthly-report?month=&year=` | JSON summary (totals, daily trend, peak timings) for one calendar month — not a formatted PDF, see `AdminExportService`'s doc comment for why |

## 16. Notifications (`/notifications`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Paginated notification list |
| PATCH | `/notifications/:id/read` | Mark one as read |
| PATCH | `/notifications/read-all` | Mark all as read |

## 17. Internal AI Service API (called by backend only, not public)

Base URL: `http://ai-services:8001` (internal network only)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/internal/voice/analyze` | Keyword spotting (Vosk) + tone analysis (librosa) on an audio clip (WAV or m4a/AAC) |
| POST | `/internal/motion/classify` | Classify an accelerometer/gyroscope window |
| POST | `/internal/safescore` | Compute a SafeScore for a single point |
| POST | `/internal/safescore/batch` | Compute SafeScores for up to 500 points in one call — what `RouteService` (candidate route samples) and `HeatmapService` (grid cells) actually call; replaced the originally-planned separate `/internal/saferoute` and `/internal/heatmap/recalculate` endpoints, see `ai-services/README.md §4` |
| POST | `/internal/chat` | RAG chatbot completion — not yet built, deferred past Phase 6 |

## 18. Error Code Vocabulary (partial, extended in Phase 2)

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing/invalid Firebase ID token or admin JWT |
| `FORBIDDEN` | 403 | Authenticated but not allowed to access this resource |
| `NOT_FOUND` | 404 | Resource doesn't exist or doesn't belong to the requester |
| `VALIDATION_ERROR` | 422 | Request body/query failed schema validation |
| `SOS_CONTACT_LIMIT_EXCEEDED` | 400 | Attempted to add a 6th emergency contact |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_SERVICE_UNAVAILABLE` | 502 | `ai-services` didn't respond; backend falls back to on-device signal only |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
