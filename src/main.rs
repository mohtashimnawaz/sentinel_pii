use anyhow::Result;
use arboard::Clipboard;
use clap::Parser;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::sleep;
use std::time::Duration;

mod scanner;
mod context;

const REDACT_TEXT: &str = "[[ SENTINEL BLOCKED: Secret Detected ]]";

#[derive(Parser, Debug)]
#[command(author, version, about = "Sentinel PII - Phase 2: Context-aware Clip-Clear", long_about = None)]
struct Args {
    /// Poll interval in milliseconds
    #[arg(long, default_value_t = 200)]
    interval: u64,

    /// Dry run: do not modify the clipboard
    #[arg(long, default_value_t = false)]
    dry_run: bool,

    /// Send native desktop notifications on block (default: true)
    #[arg(long, default_value_t = true)]
    notify: bool,

    /// Comma-separated denylist of app names (case-insensitive substring match). If empty, old behavior (always redact) applies.
    #[arg(long, value_delimiter = ',')]
    denylist: Vec<String>,

    /// Comma-separated allowlist of app names (case-insensitive substring match). If provided, matches allowlist and skips redaction.
    #[arg(long, value_delimiter = ',')]
    allowlist: Vec<String>,
}

fn main() -> Result<()> {
    env_logger::init();

    let args = Args::parse();
    log::info!("Starting sentinel_pii (interval={}ms, dry_run={})", args.interval, args.dry_run);

    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    ctrlc::set_handler(move || {
        r.store(false, Ordering::SeqCst);
    })?;

    let mut clipboard = Clipboard::new()?;

    let mut last_clipboard: Option<String> = None;

    while running.load(Ordering::SeqCst) {
        match clipboard.get_text() {
            Ok(text) => {
                if last_clipboard.as_deref() != Some(&text) {
                    log::debug!("Clipboard changed: len={}", text.len());
                    last_clipboard = Some(text.clone());

                    if let Some(secret_kind) = scanner::detect_secret_type(&text) {
                        log::warn!("Secret detected in clipboard (type={})", secret_kind);

                        // Build which denylist to use: if the user provided neither list, use a sensible default denylist
                        let effective_denylist: Vec<String> = if args.denylist.is_empty() && args.allowlist.is_empty() {
                            // Default unsafe targets: browsers and chat apps
                            vec![
                                "chrome".to_string(),
                                "safari".to_string(),
                                "firefox".to_string(),
                                "slack".to_string(),
                                "discord".to_string(),
                                "chatgpt".to_string(),
                                "teams".to_string(),
                            ]
                        } else {
                            args.denylist.clone()
                        };

                        let active_app = context::get_active_app();
                        let should_redact = context::should_redact(active_app.as_deref(), &effective_denylist, &args.allowlist);

                        if args.dry_run {
                            log::info!("dry-run: not overwriting clipboard (should_redact={})", should_redact);
                        } else if should_redact {
                            // Customize message to include secret type
                            let msg = format!("[[ SENTINEL BLOCKED: {} Secret Detected ]]", secret_kind);

                            if let Err(e) = clipboard.set_text(msg.clone()) {
                                log::error!("Failed to overwrite clipboard: {}", e);
                            } else {
                                log::info!("Clipboard overwritten with redaction: {}", secret_kind);

                                if args.notify {
                                    // Send a native notification to inform the user
                                    let body = format!("A {} secret was detected in the clipboard and was blocked.", secret_kind);
                                    if let Err(e) = notify_rust::Notification::new()
                                        .summary("Sentinel: Paste Blocked")
                                        .body(&body)
                                        .show() {
                                        log::error!("Failed to send notification: {}", e);
                                    }
                                }
                            }
                        } else {
                            // Not redacting due to context
                            if let Some(app) = active_app {
                                log::info!("Detected {} secret, but skipping redaction for active app '{}'", secret_kind, app);
                            } else {
                                log::info!("Detected {} secret, but skipping redaction (active app unknown)", secret_kind);
                            }
                        }
                    }
                }
            }
            Err(e) => {
                log::debug!("Failed to read clipboard: {}", e);
            }
        }

        sleep(Duration::from_millis(args.interval));
    }

    log::info!("Shutting down");
    Ok(())
}
