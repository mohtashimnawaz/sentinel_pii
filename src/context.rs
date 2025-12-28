use std::process::Command;

/// Returns the frontmost application's name when available.
///
/// macOS: uses `osascript` to ask System Events for the frontmost process name.
#[cfg(target_os = "macos")]
pub fn get_active_app() -> Option<String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to get name of (processes where frontmost is true)")
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let s = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if s.is_empty() {
        None
    } else {
        Some(s)
    }
}

#[cfg(not(target_os = "macos"))]
pub fn get_active_app() -> Option<String> {
    // Platform-specific implementations to be added for Windows/Linux.
    None
}

/// Case-insensitive substring match helper.
pub fn matches_app(app_name: &str, pattern: &str) -> bool {
    app_name.to_lowercase().contains(&pattern.to_lowercase())
}

/// Decide whether to redact based on the active app, allowlist, and denylist.
///
/// Rules:
/// - If allowlist is non-empty and the active app matches any allowlist entry -> DO NOT redact.
/// - If denylist is non-empty -> redact only if the active app matches any denylist entry (otherwise DO NOT redact).
/// - If both lists are empty -> redact by default.
pub fn should_redact(active_app: Option<&str>, denylist: &[String], allowlist: &[String]) -> bool {
    if !allowlist.is_empty() {
        if let Some(app) = active_app {
            if allowlist.iter().any(|a| matches_app(app, a)) {
                return false;
            }
        }
    }

    if !denylist.is_empty() {
        if let Some(app) = active_app {
            return denylist.iter().any(|d| matches_app(app, d));
        }
        // Active app unknown -> conservative: do NOT redact when denylist is set
        return false;
    }

    // Default: redact
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_app() {
        assert!(matches_app("ChatGPT - Google Chrome", "chatgpt"));
        assert!(matches_app("Discord", "discord"));
        assert!(!matches_app("Visual Studio Code", "discord"));
    }

    #[test]
    fn should_redact_allowlist_prevents_redact() {
        let active = Some("Visual Studio Code");
        // realistic allowlist entries that match the app name
        let allowlist = vec!["visual studio".to_string(), "vscode".to_string()];
        let denylist: Vec<String> = vec![];
        assert!(!should_redact(active, &denylist, &allowlist));
    }

    #[test]
    fn should_redact_with_denylist_only() {
        let active = Some("Slack");
        let allowlist: Vec<String> = vec![];
        let denylist = vec!["slack".to_string(), "chatgpt".to_string()];
        assert!(should_redact(active, &denylist, &allowlist));
    }

    #[test]
    fn should_not_redact_when_denylist_and_unknown_active() {
        let active: Option<&str> = None;
        let allowlist: Vec<String> = vec![];
        let denylist = vec!["slack".to_string()];
        assert!(!should_redact(active, &denylist, &allowlist));
    }

    // macOS-only test: will be ignored on other platforms
    #[cfg(target_os = "macos")]
    #[test]
    fn test_get_active_app_mac() {
        // This test is non-deterministic in CI, but helps locally.
        let _ = get_active_app();
    }
}
