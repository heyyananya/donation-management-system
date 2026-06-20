# Donation Management System

Production-ready React + Express donation management system for SHREE VALLABH
GAUSHALA TRUST and similar trusts. The official PDF templates
(`Receipt.pdf`, `Letter.pdf`, `ThanksLetter.pdf`) are preserved verbatim — only
dynamic values are injected at render time.

## Project layout

```
backend/         Express + JWT + Multer + pdf-lib
  src/
    config/         env, jwt
    middleware/     auth, error, upload
    repositories/   json (default), postgres (stubs) — swap via REPO_DRIVER
    services/       business logic
    controllers/    HTTP glue
    routes/         /api/*
    pdf/            renderers + PDF engine
    templates/      Receipt.pdf, Letter.pdf, ThanksLetter.pdf (visual reference)
    uploads/        donor docs, trust logos
    data/           JSON repository files
frontend/        Vite + React 18 + MUI + RHF + TanStack Query + Framer Motion
```

## Running locally

### 1. Backend (port 4000)

```bash
cd backend
npm install
npm run seed     # one-time: creates default trust, donor, remarks
npm run dev      # node --watch src/server.js
```

Defaults from `.env` (override via `.env.example`):
- Login: `admin / admin123`
- JWT lifetime: 1 day
- Repo driver: `json` (files under `backend/src/data/`)

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with `admin / admin123`.

## Feature map

| Module               | Where                                                        |
| -------------------- | ------------------------------------------------------------ |
| Dashboard            | `frontend/src/pages/dashboard/DashboardPage.jsx`             |
| Donor Master         | `frontend/src/pages/donor/*`                                 |
| Trust Master         | `frontend/src/pages/trust/*`                                 |
| Remark Master        | `frontend/src/pages/remark/*`                                |
| Donation Receipt     | `frontend/src/pages/receipt/*`                               |

## Receipt numbering rule

Receipt numbers restart at **1** for every `(Financial Year, Trust)` pair. The
sequence is enforced server-side with a per-`(fy, trustId)` async mutex in
`backend/src/services/receipt.service.js`. Verified at runtime:

| Step | Expected | Got |
| ---- | -------- | --- |
| Trust A · FY 2026-27 · 1st | 1 | 1 |
| Trust A · FY 2026-27 · 2nd | 2 | 2 |
| Trust B · FY 2026-27 · 1st | 1 | 1 |
| Trust A · FY 2024-25 · 1st | 1 | 1 |

## PDF engine

Coordinate-calibrated renderers (`backend/src/pdf/renderers/*.js`) draw the
receipt, donor's covering letter, and the 3-page thanks letter bundle on blank
A4 pages using `pdf-lib`. The original PDFs in `backend/src/templates/` are
kept on disk purely as the visual reference used to calibrate those
coordinates — adjust the constants at the top of each renderer to nudge
positions if needed.

## Database swap (future PostgreSQL)

All services depend only on repository interfaces. To switch to Postgres:
1. Implement matching repos in `backend/src/repositories/postgres/`
   (interfaces documented in `backend/src/repositories/postgres/README.md`).
2. Wire them into `drivers.postgres` in `backend/src/repositories/index.js`.
3. Set `REPO_DRIVER=postgres` in `.env`.

No service, controller, route, or frontend code needs to change.

## API quick reference

All endpoints are prefixed with `/api`, all require `Authorization: Bearer <jwt>`
except `/auth/login` and `/health`.

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST   | `/auth/login`                        | `{ username, password }` → `{ token, user }` |
| GET    | `/dashboard/summary`                 | totals + recent activity |
| GET/POST/PUT/DELETE | `/donors[/:id]`         | + `/documents` POST/DELETE for files |
| GET/POST/PUT/DELETE | `/trusts[/:id]`         | + `/logo` POST/DELETE |
| GET/POST/PUT/DELETE | `/remarks[/:id]`        | |
| GET    | `/receipts/meta`                     | payment types + current FY |
| GET    | `/receipts/peek-number?fy=&trustId=` | next auto-number |
| GET/POST/PUT/DELETE | `/receipts[/:id]`       | full CRUD with FY+Trust numbering |
| GET    | `/pdf/:type/:receiptId`              | `type ∈ { receipt, letter, thanks-letter }` |
