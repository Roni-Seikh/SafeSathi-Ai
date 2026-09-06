# SafeSathi

**Proactive Safety, Not Just an SOS Button.**

An AI-powered women's safety application that proactively detects dangerous
situations — through voice, tone, and motion analysis — and alerts trusted
contacts automatically, instead of relying on the user to press a button
under stress.

| | |
|---|---|
| **Team** | 404 Error Not Found |
| **Developer** | Roni Seikh |
| **Institution** | Brainware University |
| **Program** | B.Tech CSE — Final Year Project |

---

## 1. What SafeSathi Does

Most safety apps are reactive: something has to already be wrong, and the
user has to be free enough to open the app and tap SOS. SafeSathi is built
around the opposite assumption — that in a real emergency, the user may not
be able to do either. So it watches for danger signals in the background
(a spoken keyword, a scream, a struggle, phone snatching, a sudden fall)
and acts on the user's behalf: capturing evidence, sharing live location,
and notifying emergency contacts — while also helping the user avoid
dangerous situations in the first place through safe-route recommendations
and a live risk heatmap.

## 2. Repository Layout

This is a monorepo containing four independently deployable services and a
shared documentation set:

```
SafeSathi/
├── docs/                 → Architecture, planning, and process documentation
│   ├── architecture/      (system design, ER diagram, API design, wireframes, SafeScore)
│   └── planning/           (roadmap, milestones, git strategy, dependencies)
├── backend/               → Node.js + Express + TypeScript REST API (MongoDB Atlas)
├── mobile-app/             → React Native (Expo) app used by end users
├── ai-services/            → Python FastAPI microservice (voice, tone, motion, RAG chatbot)
└── admin-dashboard/         → React + TypeScript web app for administrators
```

Each service is self-contained (its own `package.json` / `requirements.txt`,
its own `.env.example`) and can be developed, tested, and deployed
independently, while sharing the same MongoDB Atlas cluster and Firebase
project as their common data/identity layer.

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native, Expo, TypeScript, Redux Toolkit, React Navigation |
| Backend API | Node.js, Express.js, TypeScript, Mongoose |
| Database | MongoDB Atlas |
| End-user auth | Firebase Authentication (phone OTP + email/password) |
| Admin auth | JWT (bcrypt-hashed credentials in the `Admins` collection) |
| File storage | Firebase Storage (evidence audio/photos, report images) |
| Push notifications | Firebase Cloud Messaging |
| Maps | OpenStreetMap tiles via MapLibre |
| AI microservice | Python, FastAPI |
| Speech-to-keyword | Vosk (offline, on-device-capable, English/Hindi/Bengali) |
| Voice tone analysis | librosa, numpy, scipy |
| Mobile deployment | Expo (EAS Build) |
| Backend deployment | Render |
| Admin deployment | Vercel |

## 4. Documentation Index

| Document | Purpose |
|---|---|
| [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | System design, clean-architecture layering, folder structures, data flow |
| [docs/architecture/ER_DIAGRAM.md](docs/architecture/ER_DIAGRAM.md) | Entity-relationship diagram for all 12 collections |
| [docs/architecture/API_DESIGN.md](docs/architecture/API_DESIGN.md) | Full REST API surface (`/api/v1`), request/response conventions |
| [docs/architecture/WIREFRAMES.md](docs/architecture/WIREFRAMES.md) | Text wireframes for every mobile + admin screen |
| [docs/architecture/SAFESCORE_ALGORITHM.md](docs/architecture/SAFESCORE_ALGORITHM.md) | The SafeScore (0–100) risk-scoring formula |
| [docs/planning/ROADMAP.md](docs/planning/ROADMAP.md) | 10-phase development roadmap with timeline |
| [docs/planning/MILESTONES.md](docs/planning/MILESTONES.md) | Milestones and acceptance criteria |
| [docs/planning/GIT_STRATEGY.md](docs/planning/GIT_STRATEGY.md) | Branching model, commit convention, PR process |
| [docs/planning/DEPENDENCIES.md](docs/planning/DEPENDENCIES.md) | Full dependency list per service, with purpose |

Further documents (SRS, Synopsis, Project Report, Testing Guide, Deployment
Guide, User Manual) are produced in **Phase 9 — Documentation**, once the
system they describe actually exists.

## 5. Build Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture & planning | ✅ Complete |
| 2 | Backend (Express + MongoDB + Firebase Auth) | 🟡 Core complete — auth, users, contacts, SOS pipeline, notifications, admin login. Voice/sensor/report/route/heatmap/chat endpoints ship with Phases 5–7 (see `backend/README.md`) |
| 3 | React Native app — auth, navigation, UI | 🟡 Core complete — auth/OTP flow, Home + SOS trigger, Profile, Emergency Contacts, Settings, all wired to the live backend. Live location map, push registration, and voice/motion detection ship with Phases 4–5 (see `mobile-app/README.md`) |
| 4 | SOS, GPS, contacts, notifications | 🟡 Core complete — live location sharing (REST + Socket.IO), auto-started/stopped with SOS, native push-token registration, notification-tap routing. No embedded map yet (see `mobile-app/README.md`) |
| 5 | AI services (Vosk, tone detection, motion detection) | 🟡 Core complete — FastAPI service with tone analysis and a **trained** (97.7% test accuracy) motion classifier, both verified by actually running them; Vosk wired for English/Hindi (Bengali is a documented upstream gap, not a bug — see `ai-services/README.md`). `/voice-logs` and `/sensor-logs` auto-trigger SOS end-to-end. Mobile on-device motion detection is fully verified (pure JS); voice detection is written but not yet smoke-tested on a real device (see `mobile-app/README.md`). |
| 6 | Safe route and heatmap | 🟡 Core complete — backend (Reports, proactive Community Alerts, Heatmap from real data, Safe Route with real scoring / simplified straight-line geometry) and mobile (all four screens, list/badge-based UI). Embedded map (MapLibre) deferred as its own follow-up — see `mobile-app/README.md`. |
| 7 | Admin dashboard | 🟡 Backend complete — analytics, user management, report moderation, SOS monitor, heatmap management, CSV export, monthly summary, all role-gated. React frontend not yet built (see `docs/planning/MILESTONES.md`). |
| 8 | Testing and debugging | ⏳ Not started |
| 9 | Documentation (SRS, synopsis, report, diagrams, README) | ⏳ Not started |
| 10 | Deployment (Render, Vercel, MongoDB Atlas, Firebase) | ⏳ Not started |

## 6. Getting Started

Each service will get its own setup instructions as it's built (Phase 2
onward). For now, every service folder contains the dependency manifest
(`package.json` / `requirements.txt`) and a `.env.example` describing the
configuration it will need, so the environment can be provisioned ahead of
time:

```bash
# Backend
cd backend && npm install

# Mobile app
cd mobile-app && npm install

# AI services
cd ai-services && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt

# Admin dashboard
cd admin-dashboard && npm install
```

## 7. License

Academic project — Brainware University, B.Tech CSE Final Year Project,
Team 404 Error Not Found.
