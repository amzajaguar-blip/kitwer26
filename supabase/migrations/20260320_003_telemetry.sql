-- Tabella telemetria proprietaria (zero Google Analytics)
CREATE TABLE IF NOT EXISTS telemetry (
  id         BIGSERIAL PRIMARY KEY,
  page_path  TEXT        NOT NULL,
  visitor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telemetry_created_at_idx ON telemetry (created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_page_path_idx  ON telemetry (page_path);

-- RLS: solo service role può leggere, tutti possono inserire (il middleware usa service role key)
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON telemetry USING (true) WITH CHECK (true);
