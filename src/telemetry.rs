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

        let mut f = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.cfg.queue_file)?;

        let line = serde_json::to_string(&event)?;
        writeln!(f, "{}", line)?;
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
