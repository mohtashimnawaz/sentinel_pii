use crate::scanner;
use chrono::Utc;
use reqwest::blocking::Client;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Seek, SeekFrom, Write};
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Clone, Debug)]
pub struct TelemetryConfig {
    pub url: Option<String>,
    pub api_key: Option<String>,
    pub queue_file: PathBuf,
    pub enabled: bool,
}

impl Default for TelemetryConfig {
    fn default() -> Self {
        let mut q = std::env::temp_dir();
        q.push("sentinel_telemetry_queue.jsonl");
        Self {
            url: None,
            api_key: None,
            queue_file: q,
            enabled: false,
        }
    }
}

#[derive(Serialize, Debug)]
pub struct TelemetryEvent {
    pub event_id: String,
    pub timestamp: String,
    pub secret_type: String,
    pub action: String,
    pub app_name: Option<String>,
    pub rule: Option<String>,
    pub machine_id_hashed: Option<String>,
    pub agent_version: String,
}

pub struct Telemetry {
    cfg: TelemetryConfig,
}

impl Telemetry {
    pub fn new(cfg: TelemetryConfig) -> Self {
        Self { cfg }
    }

    /// Queue an event to local file for later upload.
    pub fn queue_event(&self, event: TelemetryEvent) -> std::io::Result<()> {
        if !self.cfg.enabled {
            log::debug!("Telemetry disabled; not queueing event");
            return Ok(());
        }

        // Ensure directory exists
        if let Some(parent) = self.cfg.queue_file.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Create file with restrictive permissions when possible
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            let mut f = OpenOptions::new()
                .create(true)
                .append(true)
                .mode(0o600)
                .open(&self.cfg.queue_file)?;

            let line = serde_json::to_string(&event)?;
            writeln!(f, "{}", line)?;
        }

        #[cfg(not(unix))]
        {
            let mut f = OpenOptions::new().create(true).append(true).open(&self.cfg.queue_file)?;
            let line = serde_json::to_string(&event)?;
            writeln!(f, "{}", line)?;
        }

        // Rotate if file too large
        self.rotate_if_needed()?;

        // Prune old events
        self.prune_old_events()?;

        Ok(())
    }

    /// Attempt a single flush of queued events to the configured telemetry URL.
    pub fn flush_once(&self) -> anyhow::Result<()> {
        if !self.cfg.enabled {
            log::debug!("Telemetry disabled; not flushing");
            return Ok(());
        }

        let url = match &self.cfg.url {
            Some(u) => u.clone(),
            None => {
                log::debug!("Telemetry URL not configured; skipping flush");
                return Ok(());
            }
        };

        // Read lines and parse JSON values into a vector
        let f = OpenOptions::new().read(true).open(&self.cfg.queue_file)?;
        let reader = BufReader::new(f);
        let mut events: Vec<serde_json::Value> = Vec::new();
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            let v: serde_json::Value = serde_json::from_str(&line)?;
            events.push(v);
        }

        if events.is_empty() {
            log::debug!("No telemetry events to flush");
            return Ok(());
        }

        let client = Client::new();
        let mut req = client.post(&url).json(&events);
        if let Some(ref k) = self.cfg.api_key {
            req = req.header("Authorization", format!("Bearer {}", k));
        }

        let resp = req.send()?;
        if resp.status().is_success() {
            // Truncate the queue file
            let mut f = File::create(&self.cfg.queue_file)?;
            f.set_len(0)?;
            log::info!("Telemetry flushed {} events", events.len());
        } else {
            log::warn!("Telemetry endpoint returned non-200: {}", resp.status());
        }

        Ok(())
    }

    pub fn make_event(
        &self,
        secret_type: &str,
        action: &str,
        app_name: Option<String>,
        rule: Option<String>,
    ) -> TelemetryEvent {
        TelemetryEvent {
            event_id: Uuid::new_v4().to_string(),
            timestamp: Utc::now().to_rfc3339(),
            secret_type: secret_type.to_string(),
            action: action.to_string(),
            app_name,
            rule,
            machine_id_hashed: Self::machine_hash(),
            agent_version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }

    fn machine_hash() -> Option<String> {
        if let Ok(name) = hostname::get() {
            if let Some(s) = name.to_str() {
                let mut hasher = Sha256::new();
                hasher.update(s.as_bytes());
                let res = hasher.finalize();
                return Some(hex::encode(res));
            }
        }
        None
    }

    /// Rotate the queue file if it exceeds MAX_QUEUE_BYTES. Rotation renames the current file
    /// to `{queue_file}.{timestamp}.old` and creates a new empty queue file with restrictive
    /// permissions when possible.
    pub fn rotate_if_needed(&self) -> std::io::Result<()> {
        const MAX_QUEUE_BYTES: u64 = 1_000_000; // 1 MB

        let meta = match std::fs::metadata(&self.cfg.queue_file) {
            Ok(m) => m,
            Err(_) => return Ok(()), // nothing to rotate
        };

        if meta.len() <= MAX_QUEUE_BYTES {
            return Ok(());
        }

        let ts = Utc::now().format("%Y%m%d%H%M%S").to_string();
        let mut rotated = self.cfg.queue_file.clone();
        rotated.set_extension(format!("{}.old", ts));
        std::fs::rename(&self.cfg.queue_file, &rotated)?;

        // Create new empty file with secure perms
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            OpenOptions::new().create(true).write(true).mode(0o600).open(&self.cfg.queue_file)?;
        }
        #[cfg(not(unix))]
        {
            OpenOptions::new().create(true).write(true).open(&self.cfg.queue_file)?;
        }

        log::info!("Rotated telemetry queue to {:?}", rotated);
        Ok(())
    }

    /// Prune events older than MAX_AGE_DAYS from the queue file. This reads all events and
    /// re-writes only recent events back into the queue file atomically.
    pub fn prune_old_events(&self) -> std::io::Result<()> {
        const MAX_AGE_DAYS: i64 = 30;
        let cutoff = Utc::now() - chrono::Duration::days(MAX_AGE_DAYS);

        let f = match OpenOptions::new().read(true).open(&self.cfg.queue_file) {
            Ok(f) => f,
            Err(_) => return Ok(()),
        };

        let reader = BufReader::new(f);
        let mut keep: Vec<String> = Vec::new();

        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
                if let Some(ts) = v.get("timestamp").and_then(|t| t.as_str()) {
                    if let Ok(t) = chrono::DateTime::parse_from_rfc3339(ts) {
                        if t.with_timezone(&Utc) >= cutoff {
                            keep.push(line);
                        }
                        continue;
                    }
                }
            }
            // If we can't parse timestamp, keep by default
            keep.push(line);
        }

        // Write back atomically
        let mut temp = self.cfg.queue_file.clone();
        temp.set_extension("tmp");
        {
            #[cfg(unix)]
            {
                use std::os::unix::fs::OpenOptionsExt;
                let mut f = OpenOptions::new().create(true).write(true).mode(0o600).open(&temp)?;
                for l in &keep {
                    writeln!(f, "{}", l)?;
                }
            }
            #[cfg(not(unix))]
            {
                let mut f = OpenOptions::new().create(true).write(true).open(&temp)?;
                for l in &keep {
                    writeln!(f, "{}", l)?;
                }
            }
        }

        std::fs::rename(&temp, &self.cfg.queue_file)?;
        log::info!("Pruned telemetry queue; kept {} events", keep.len());

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_event_serializes() {
        let cfg = TelemetryConfig::default();
        let t = Telemetry::new(cfg);
        let ev = t.make_event("Stripe", "blocked", Some("Slack".to_string()), Some("denylist-default".to_string()));
        let s = serde_json::to_string(&ev).unwrap();
        assert!(s.contains("Stripe"));
        assert!(s.contains("blocked"));
    }
}
