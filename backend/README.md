# SafeSathi Backend

Node.js + Express + TypeScript REST API, MongoDB Atlas via Mongoose,
Firebase Admin for end-user auth/storage/push. See
`docs/architecture/ARCHITECTURE.md` for the full design and
`docs/architecture/API_DESIGN.md` for the endpoint reference and current
implementation status.

## 1. Setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `MONGODB_URI` — a MongoDB Atlas connection string (free tier is fine for development)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET` — from Firebase Console → Project Settings → Service Accounts → Generate new private key
- `JWT_SECRET` — any long random string, used only for admin sessions

## 2. Run

```bash
npm run dev        # ts-node-dev, hot reload, http://localhost:5000
npm run build       # compile to dist/
npm start            # run the compiled build
```

`/voice-logs` and `/sensor-logs` call out to the AI service
(`AI_SERVICE_BASE_URL` in `.env`, default `http://localhost:8001`) — see
`../ai-services/README.md` to get that running too. Every other endpoint
works without it.

Smoke test:
```bash
curl http://localhost:5000/health
curl http://localhost:5000/api/v1
```

## 3. Create the first admin account

There's no public admin-registration endpoint by design (see
`docs/architecture/ARCHITECTURE.md` §12) — the first admin is created by a
one-off script:

```bash
ADMIN_EMAIL=admin@safesathi.app ADMIN_PASSWORD=change-me-immediately npm run seed:admin
```

Then `POST /api/v1/admin/auth/login` with that email/password returns a JWT.

## 4. What's implemented right now

**Live (Phases 2–7):**
- Auth — register/login sync against Firebase, refresh-profile, logout, delete account
- Users — profile, medical info, safety preferences, avatar upload URL, FCM token registration
- Emergency Contacts — add/update/remove, capped at 5, auto-linked to a SafeSathi account by phone number
- SOS — trigger, active, history, resolve, false-alarm, "I'm Safe" — with **real** contact notification: FCM push to contacts who are also SafeSathi users, SMS-gateway fallback (logged, pluggable) otherwise. Triggering SOS now **automatically starts live location sharing** with those same contacts, and resolving/false-alarming/"I'm Safe" stops it.
- Location — record a point, get a contact's live location (authorization-checked), start/stop sharing sessions, history. Live updates broadcast over a **Socket.IO** channel (`location:<userId>` room), auth'd the same way as REST (a Firebase ID token, passed via the socket handshake).
- **Voice logs** — upload a short audio clip (`POST /voice-logs`, multipart, WAV or m4a/AAC), forwarded to the AI service for Vosk keyword spotting + librosa tone analysis; a matched keyword or a scream above threshold auto-triggers SOS through the exact same `SOSService.trigger()` a manual press uses.
- **Sensor logs** — submit accelerometer/gyroscope summary stats (`POST /sensor-logs`), forwarded to the AI service's trained motion classifier; a confirmed phone-snatch/violent-movement/sudden-fall signature above threshold auto-triggers SOS the same way.
- **Reports** — file an incident report (optionally anonymous), image upload via signed Firebase Storage URLs; filing one **proactively notifies** nearby opted-in users, not just a pull-based list.
- **Community Alerts** — pull nearby alerts, opt in/out of the proactive push above.
- **Heatmap** — real risk zones aggregated from Report/SOSLog density in a bounding box; any user can recalculate their own visible area.
- **Safe Route** — candidate routes ranked by SafeScore sampled along each — real scoring against real nearby-incident data; candidate *route geometry* is a documented straight-line simplification pending a real routing engine (see `src/services/route.service.ts`'s scope note).
- Notifications — list, mark read, mark all read
- **Admin** — login (JWT), analytics (overview/SOS-trend/peak-timings from real aggregated data), user management (list/search/deactivate), report moderation (list/verify/reject), live+historical SOS monitor, heatmap management (global list + wide-area recalculate), CSV export, monthly JSON summary. Read endpoints work for any admin; mutations require `super_admin`/`moderator` (see `requireAdminRole`).

**Not yet implemented** — see `docs/architecture/API_DESIGN.md`'s status
table for exactly which phase each one ships in: the AI chatbot (RAG) and
fake-call logging. The **admin dashboard frontend** (a React app to
actually present the admin API above) is also not built yet — see
`admin-dashboard/` and `docs/planning/MILESTONES.md`'s M7.

**Known follow-up:** `npm install` currently warns that `multer@1.x` has
known advisories; it's on the maintained 1.x LTS patch branch, and a move
to `multer@2.x` is a real (if not huge) breaking-change migration —
tracked for Phase 8 rather than folded into this delivery.

## 5. Testing the live-location socket

The socket auth expects the same Firebase ID token as REST, passed via
the handshake instead of a header:

```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', { auth: { token: firebaseIdToken } });
socket.emit('location:watch', { sharerUserId }, (ack) => console.log(ack)); // { ok: true } if authorized
socket.on('location:update', console.log);
```

`ack.ok` is `false` if the target user isn't currently sharing, or isn't
sharing with this particular viewer — same authorization rule as
`GET /location/live/:userId`.

## 6. Verifying changes

```bash
npx tsc --noEmit -p tsconfig.json   # type-check
npm run lint                          # lint (Phase 8 adds the CI gate for this)
npm test                               # Jest + Supertest (added Phase 8)
```

Every model and every file in this backend has already been type-checked
against the real installed dependency versions, not just visually reviewed.
