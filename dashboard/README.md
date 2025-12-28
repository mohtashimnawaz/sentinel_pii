# Sentinel Dashboard (MVP)

This is a minimal prototype to ingest anonymized telemetry events from deployed agents and provide a simple dashboard.

Quickstart (local):

1. Copy `.env.example` to `.env` and edit as needed. Example local values:

```text
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sentinel
INGEST_API_KEY=test-ingest-key-123
ADMIN_SECRET=admin-secret
REDIS_URL=redis://localhost:6379
```

2. Start local Postgres and Redis (requires Docker):

```bash
docker compose up -d db redis
```

3. Run migrations (from `dashboard/`):

```bash
npm run migrate
```

4. Seed an API key from `INGEST_API_KEY` into the DB (optional when using DB-backed auth):

```bash
node scripts/seed_api_key.js
```

5. Start the dev server:

```bash
npm run dev
```

6. Test the ingest endpoint:

```bash
curl -X POST http://localhost:3000/api/events \
  -H 'Authorization: Bearer test-ingest-key-123' \
  -H 'Content-Type: application/json' \
  -d '{"timestamp":"2025-12-29T00:00:00Z","secret_type":"AWS","action":"blocked"}'
```

Notes:
- If Docker is unavailable, you can still run the Next dev server and test validation/auth flows, but DB insertions will return `Database not configured` until Postgres is running.
- Admin UI: `pages/admin/keys` is protected by `ADMIN_SECRET` (server); in browser set `NEXT_PUBLIC_ADMIN_SECRET` to the same value for the demo UI to call the admin APIs.

API endpoints:
- POST `/api/events` — accepts telemetry event JSON (see `docs/telemetry.md` for schema). Requires `Authorization: Bearer <INGEST_API_KEY>` if `INGEST_API_KEY` is set in the environment.
- GET `/api/stats` — basic aggregation for dashboard.

Security & rate limiting:
- The ingest API supports a single API key (set `INGEST_API_KEY` in environment). Requests without a valid key are rejected with 401.
- A simple in-memory rate limiter enforces a limit (~120 req/min per API key) to prevent abuse. For production, use a Redis-backed rate limiter and proper authentication.

Notes:
- This is intentionally minimal; production should have authentication, rate-limiting, input validation, and stricter privacy safeguards (sampling, aggregation, no raw clipboard content ever).
