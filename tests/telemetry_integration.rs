use httpmock::MockServer;
use httpmock::Method::POST;
use httpmock::Mock;
use std::fs::OpenOptions;
use std::io::Write;
use tempfile::tempdir;
use sentinel_pii::telemetry::{TelemetryConfig, Telemetry, TelemetryEvent};

#[test]
fn telem_flush_posts_and_truncates_queue() {
    // Start a mock server
    let server = MockServer::start();

    let mock = server.mock(|when, then| {
        when.method(POST).path("/events");
        then.status(200).header("content-type", "application/json").body("ok");
    });

    // prepare a temporary queue file with two events
    let dir = tempdir().unwrap();
    let qpath = dir.path().join("tele_queue.jsonl");
    let mut f = OpenOptions::new().create(true).append(true).open(&qpath).unwrap();

    let ev1 = TelemetryEvent {
        event_id: "1".to_string(),
        timestamp: "t1".to_string(),
        secret_type: "Stripe".to_string(),
        action: "blocked".to_string(),
        app_name: Some("Slack".to_string()),
        rule: Some("denylist-default".to_string()),
        machine_id_hashed: Some("m1".to_string()),
        agent_version: "0.1.0".to_string(),
    };

    let ev2 = TelemetryEvent {
        event_id: "2".to_string(),
        timestamp: "t2".to_string(),
        secret_type: "AWS".to_string(),
        action: "blocked".to_string(),
        app_name: Some("Chrome".to_string()),
        rule: Some("denylist-default".to_string()),
        machine_id_hashed: Some("m1".to_string()),
        agent_version: "0.1.0".to_string(),
    };

    writeln!(f, "{}", serde_json::to_string(&ev1).unwrap()).unwrap();
    writeln!(f, "{}", serde_json::to_string(&ev2).unwrap()).unwrap();
    drop(f);

    let cfg = TelemetryConfig {
        url: Some(format!("{}/events", server.base_url())),
        api_key: Some("testkey".to_string()),
        queue_file: qpath.clone(),
        enabled: true,
    };

    let tele = Telemetry::new(cfg);

    // Should flush once successfully and the mock should be called
    tele.flush_once().expect("flush should succeed");

    mock.assert();

    // queue file should be truncated to zero length
    let metadata = std::fs::metadata(&qpath).unwrap();
    assert_eq!(metadata.len(), 0);
}
