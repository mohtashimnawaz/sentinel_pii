# Sentinel Dashboard (MVP)

This is a minimal prototype to ingest anonymized telemetry events from deployed agents and provide a simple dashboard.

Quickstart (local):

1. Copy `.env.example` to `.env` and edit as needed.
2. Start local Postgres: `docker-compose up -d db`.
3. Run migrations: `npm run migrate` (from `dashboard/`).
4. Start dev server: `npm run dev` and visit http://localhost:3000

API endpoints:
- POST `/api/events` — accepts telemetry event JSON (see `docs/telemetry.md` for schema).
- GET `/api/stats` — basic aggregation for dashboard.

Notes:
- This is intentionally minimal; production should have authentication, rate-limiting, input validation, and stricter privacy safeguards (sampling, aggregation, no raw clipboard content ever).
