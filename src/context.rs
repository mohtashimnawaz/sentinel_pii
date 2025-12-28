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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matches_app() {
        assert!(matches_app("ChatGPT - Google Chrome", "chatgpt"));
        assert!(matches_app("Discord", "discord"));
        assert!(!matches_app("Visual Studio Code", "discord"));
    }

    // macOS-only test: will be ignored on other platforms
    #[cfg(target_os = "macos")]
    #[test]
    fn test_get_active_app_mac() {
        // This test is non-deterministic in CI, but helps locally.
        let _ = get_active_app();
    }
}
