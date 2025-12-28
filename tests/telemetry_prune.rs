use sentinel_pii::telemetry::{TelemetryConfig, Telemetry, TelemetryEvent};
use tempfile::tempdir;
use std::fs::OpenOptions;
use std::io::Write;
use chrono::Utc;

#[test]
fn prune_old_events_removes_old() {
    let dir = tempdir().unwrap();
    let qpath = dir.path().join("tele_queue.jsonl");

    // Create two events: one old, one recent
    let old_ts = (Utc::now() - chrono::Duration::days(40)).to_rfc3339();
    let recent_ts = Utc::now().to_rfc3339();

    let ev_old = TelemetryEvent {
        event_id: "old".to_string(),
        timestamp: old_ts.clone(),
        secret_type: "Stripe".to_string(),
        action: "blocked".to_string(),
        app_name: Some("Slack".to_string()),
        rule: Some("denylist-default".to_string()),
        machine_id_hashed: Some("m1".to_string()),
        agent_version: "0.1.0".to_string(),
    };

    let ev_recent = TelemetryEvent {
        event_id: "recent".to_string(),
        timestamp: recent_ts.clone(),
        secret_type: "AWS".to_string(),
        action: "blocked".to_string(),
        app_name: Some("Chrome".to_string()),
        rule: Some("denylist-default".to_string()),
        machine_id_hashed: Some("m1".to_string()),
        agent_version: "0.1.0".to_string(),
    };

    let mut f = OpenOptions::new().create(true).append(true).open(&qpath).unwrap();
    writeln!(f, "{}", serde_json::to_string(&ev_old).unwrap()).unwrap();
    writeln!(f, "{}", serde_json::to_string(&ev_recent).unwrap()).unwrap();
    drop(f);

    let cfg = TelemetryConfig { url: None, api_key: None, queue_file: qpath.clone(), enabled: true };
    let tele = Telemetry::new(cfg);

    tele.prune_old_events().unwrap();

    let data = std::fs::read_to_string(&qpath).unwrap();
    assert!(data.contains("recent"));
    assert!(!data.contains("old"));
}
