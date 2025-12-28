# Intune Deployment Notes (Windows)

1. Build an `.msi` installer for the `sentinel_pii` agent.
2. Register the binary as a Windows Service or Scheduled Task to run at startup.
3. Ensure the installer sets required permissions for accessing clipboard and querying active window (may require elevated privileges).
4. Configuration via Intune:
   - Push configuration via a JSON in `%ProgramData%\Sentinel\config.json` containing `denylist`, `allowlist`, and telemetry settings.
5. Signing & Trust:
   - Sign MSI with a code-signing certificate trusted by your org to avoid SmartScreen blocks.
6. Uninstall script:
   - Provide a script to stop service and remove installed files.
