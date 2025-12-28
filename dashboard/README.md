# Sentinel Dashboard (MVP)

This is a minimal prototype to ingest anonymized telemetry events from deployed agents and provide a simple dashboard.

Quickstart (local):

1. Copy `.env.example` to `.env` and edit as needed.
2. Start local Postgres: `docker-compose up -d db`.
3. Run migrations: `npm run migrate` (from `dashboard/`).
4. Start dev server: `npm run dev` and visit http://localhost:3000

API endpoints:
- POST `/api/events` — accepts telemetry event JSON (see `docs/telemetry.md` for schema). Requires `Authorization: Bearer <INGEST_API_KEY>` if `INGEST_API_KEY` is set in the environment.
- GET `/api/stats` — basic aggregation for dashboard.

Security & rate limiting:
- The ingest API supports a single API key (set `INGEST_API_KEY` in environment). Requests without a valid key are rejected with 401.
- A simple in-memory rate limiter enforces a limit (~120 req/min per API key) to prevent abuse. For production, use a Redis-backed rate limiter and proper authentication.

Notes:
- This is intentionally minimal; production should have authentication, rate-limiting, input validation, and stricter privacy safeguards (sampling, aggregation, no raw clipboard content ever).
