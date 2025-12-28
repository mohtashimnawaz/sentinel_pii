-- Telemetry events table
CREATE TABLE IF NOT EXISTS telemetry_events (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  secret_type TEXT NOT NULL,
  action TEXT NOT NULL,
  app_name TEXT,
  rule TEXT,
  machine_id_hashed TEXT,
  agent_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_timestamp ON telemetry_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_app_name ON telemetry_events (app_name);
