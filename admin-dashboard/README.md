# SafeSathi Admin Dashboard

React + TypeScript + Vite frontend for the SafeSathi admin backend
(`backend/src/routes/admin.routes.ts`). Talks to every admin endpoint that
already exists on the API: auth, analytics, users, reports, SOS monitor,
heatmap zones, and CSV/monthly exports.

## Pages

| Route       | What it does |
|-------------|--------------|
| `/login`    | Admin sign-in (`POST /admin/auth/login`), stores the JWT + role in Redux + localStorage |
| `/`         | Overview — stat cards, 14-day SOS trend chart, peak-hour chart, banner when SOS is active right now |
| `/sos`      | Live + historical SOS monitor, status filter, auto-refreshes every 15s, map preview per event |
| `/reports`  | Report moderation queue — filter by status, verify/reject with a reason (moderator/super_admin only) |
| `/users`    | Search + paginate users, activate/deactivate accounts (moderator/super_admin only) |
| `/heatmap`  | Map of all risk zones colour-coded by risk level, zone table, recalculate-by-bounding-box action |
| `/export`   | Download CSV (users/reports/SOS), generate + print a monthly summary report |

Role gating mirrors the backend exactly: `analyst` accounts see everything
but the mutating buttons (verify/reject/deactivate/recalculate) are hidden,
since the API would reject those calls anyway.

## Setup

```bash
cd admin-dashboard
npm install
cp .env.example .env      # point VITE_API_BASE_URL at your backend
npm run dev                # http://localhost:5173
```

The backend's default `CORS_ORIGIN` already includes
`http://localhost:5173`, so no backend config changes are needed for local
dev. Before logging in, make sure at least one admin exists:

```bash
cd backend
ADMIN_EMAIL=admin@safesathi.app ADMIN_PASSWORD=change-me-immediately npm run seed:admin
```

## Notes

- All API calls go through `src/services/apiClient.ts`, which attaches the
  JWT and redirects to `/login` on a 401 (expired/invalid session).
- `src/types/index.ts` mirrors the Mongoose models 1:1, so if a backend
  model field changes, update it there first — the rest of the app is
  built against those types.
- The monthly report is a structured JSON summary rendered as a page (per
  the backend's own comment in `adminExport.service.ts`) — "Print / save as
  PDF" uses the browser's print dialog rather than a server-side PDF
  dependency.
