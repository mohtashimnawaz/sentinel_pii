# Sentinel PII — Phase 1: Clip-Clear

Small PoC that monitors the system clipboard and redacts AWS Access Keys (AKIA...) when detected.

Run with:

```bash
cargo run -- --interval 200 --dry-run
```

- `--interval` polling interval in milliseconds
- `--dry-run` will log detections but not overwrite the clipboard
- `--denylist` comma-separated app substrings that should be blocked (e.g. `--denylist ChatGPT,Discord,Slack`). If unspecified, the default Phase 1 behavior (always redact) applies.
- `--allowlist` comma-separated app substrings that should be allowed and skip redaction (e.g. `--allowlist "VS Code",vscode`).
- `--notify` (true/false) - send native desktop notifications when a paste is blocked (default: true).

Behavior:
- If `--denylist` is provided, the daemon will only redact when the active app matches an entry in the denylist.
- If `--allowlist` is provided and the active app matches an allowlist entry, the daemon will skip redaction.
- If neither list is provided, Phase 1 behavior is used (always redact when a secret is detected).
- On redaction, the clipboard is replaced with `[[ SENTINEL BLOCKED: Secret Detected ]]` and a native desktop notification is shown if `--notify` is enabled.

Notes:
- This is a Phase 1 PoC: no GUI, no active window checks, and no telemetry.
- Make sure to run in a safe environment; clipboard access may require permissions on some platforms.
