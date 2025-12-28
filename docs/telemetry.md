# Telemetry Design (Sentinel PII)

Purpose: provide admins with anonymized "shadow reports" about blocked paste events while preserving user privacy.

Configuration
- `--telemetry` (bool): Enable telemetry. Default: false (opt-in).
- `--telemetry-url` (string): Ingest URL for events (HTTPS recommended).
- `--telemetry-api-key` (string): Optional API key to authenticate uploads.

Event Schema (JSON):
- event_id: uuid
- timestamp: ISO-8601
- secret_type: string (example: "AWS", "Stripe")
- action: "blocked" | "allowed" | "detected_but_skipped"
- app_name: optional string (frontmost app name)
- rule: optional string (which rule caused the block)
- machine_id_hashed: optional string (sha256 hex of hostname)
- agent_version: string

Privacy & Security
- No raw clipboard content is persisted or transmitted.
- Events are queued locally in `TMPDIR/sentinel_telemetry_queue.jsonl` until they are successfully delivered.
- Default: telemetry disabled. Admins can enable via MDM profile that sets `--telemetry` and `--telemetry-url`.
- Event sampling & rate limiting should be implemented in ingestion to avoid accidental data exfil.
