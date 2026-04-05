-- ============================================================
-- KITWER26 — Audit Log Ledger (Task 1)
-- Immutable event ledger for all critical operations.
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp   TIMESTAMPTZ NOT NULL    DEFAULT now(),
  event_type  TEXT        NOT NULL,
  severity    TEXT        NOT NULL    CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
  metadata    JSONB,
  actor_id    TEXT        NOT NULL    DEFAULT 'SYSTEM'
);

-- ── Performance indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp  ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity   ON audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs (event_type);

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- service_role bypasses RLS entirely → used by the server for writes/reads.
-- Anonymous and authenticated roles are blocked from direct access.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Block all direct client access (anon / authenticated JWT)
CREATE POLICY "audit_logs_block_public"
  ON audit_logs
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ── Comments ───────────────────────────────────────────────────────────────────
COMMENT ON TABLE  audit_logs            IS 'Immutable security and operations event ledger';
COMMENT ON COLUMN audit_logs.event_type IS 'AUTH_SUCCESS | AUTH_FAILURE | PAYMENT_INITIATED | PAYMENT_COMPLETED | PAYMENT_FAILED | BUNDLE_PURCHASE | CRITICAL_ERROR | SYSTEM_EVENT';
COMMENT ON COLUMN audit_logs.severity   IS 'INFO | WARN | CRITICAL';
COMMENT ON COLUMN audit_logs.metadata   IS 'Sanitized context — no raw credentials, emails masked, IDs truncated';
COMMENT ON COLUMN audit_logs.actor_id   IS 'SYSTEM for server events, hashed IP or session ref for user events';
