# Jamf Deployment Notes (macOS)

1. Build a signed `.pkg` installer for the `sentinel_pii` binary.
2. Add a LaunchDaemon plist to run the agent at boot:
   - `/Library/LaunchDaemons/com.example.sentinel.plist`
   - Run as root/system or per-user as needed.
3. Accessibility & Clipboard Permissions:
   - The agent may need Accessibility privileges for active-window detection via AX APIs. Use Jamf to push a configuration profile that pre-approves Accessibility for the installed binary if possible.
4. Configuration via MDM:
   - Use a managed preference or a config file at `/etc/sentinel/config.json` to push `denylist`, `allowlist`, and telemetry settings.
5. Monitoring & Logging:
   - The agent logs to stdout/stderr. Use Jamf scripts to collect logs if needed.
6. Uninstall script:
   - Provide `scripts/uninstall_sentinel.sh` that stops LaunchDaemon and removes binaries and config.
