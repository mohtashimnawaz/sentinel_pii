-- Create API keys table for ingest authentication
CREATE TABLE IF NOT EXISTS ingest_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  key_hash TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingest_keys_key_hash ON ingest_keys (key_hash);
