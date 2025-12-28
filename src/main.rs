use anyhow::Result;
use arboard::Clipboard;
use clap::Parser;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::sleep;
use std::time::Duration;

mod scanner;
mod context;

const REDACT_TEXT: &str = "[REDACTED: Secret Key Detected]";

#[derive(Parser, Debug)]
#[command(author, version, about = "Sentinel PII - Phase 2: Context-aware Clip-Clear", long_about = None)]
struct Args {
    /// Poll interval in milliseconds
    #[arg(long, default_value_t = 200)]
    interval: u64,

    /// Dry run: do not modify the clipboard
    #[arg(long, default_value_t = false)]
    dry_run: bool,

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

                    if scanner::contains_secret(&text) {
                        log::warn!("Secret detected in clipboard");

                        // Check context (active app) to decide whether to redact.
                        let active_app = context::get_active_app();
                        let mut should_redact = true;

                        if !args.allowlist.is_empty() {
                            if let Some(ref app) = active_app {
                                if args.allowlist.iter().any(|a| context::matches_app(app, a)) {
                                    should_redact = false;
                                    log::info!("Active app '{}' matches allowlist; skipping redaction", app);
                                }
                            }
                        }

                        if !args.denylist.is_empty() {
                            // If denylist present, we redact only when active app matches denylist.
                            should_redact = false;
                            if let Some(ref app) = active_app {
                                if args.denylist.iter().any(|a| context::matches_app(app, a)) {
                                    should_redact = true;
                                    log::info!("Active app '{}' matches denylist; will redact", app);
                                } else {
                                    log::info!("Active app '{}' not in denylist; not redacting", app);
                                }
                            } else {
                                log::info!("Active app unknown; not redacting when denylist is set");
                            }
                        }

                        if args.dry_run {
                            log::info!("dry-run: not overwriting clipboard (should_redact={})", should_redact);
                        } else if should_redact {
                            if let Err(e) = clipboard.set_text(REDACT_TEXT.to_string()) {
                                log::error!("Failed to overwrite clipboard: {}", e);
                            } else {
                                log::info!("Clipboard overwritten with redaction");
                            }
                        } else {
                            // Not redacting due to context
                            log::info!("Detected secret, but skipping redaction due to context");
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
