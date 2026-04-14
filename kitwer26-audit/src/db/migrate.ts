/**
 * Creates audit tables if they don't exist.
 * Safe to run multiple times (idempotent).
 * Call once at startup via main.ts.
 */

import { getPool } from '../config/clients.js';

const CREATE_TABLES_SQL = `
-- audit_runs
CREATE TABLE IF NOT EXISTS audit_runs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id                 TEXT NOT NULL UNIQUE,
  iteration               INTEGER NOT NULL DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'running',
  risk_level              TEXT,
  active_valid_products   INTEGER DEFAULT 0,
  revenue_leaks_found     INTEGER DEFAULT 0,
  affiliate_tag_missing   INTEGER DEFAULT 0,
  margin_errors           INTEGER DEFAULT 0,
  placeholder_errors      INTEGER DEFAULT 0,
  potential_lost_value_eur NUMERIC(12,2) DEFAULT 0,
  fixes_applied           INTEGER DEFAULT 0,
  converged               BOOLEAN DEFAULT FALSE,
  next_step               TEXT,
  index_hit_rate          TEXT,
  avg_query_time_ms       INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT now(),
  completed_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_scan_id ON audit_runs (scan_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_status  ON audit_runs (status);

-- audit_findings
CREATE TABLE IF NOT EXISTS audit_findings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id      TEXT NOT NULL,
  run_id       UUID NOT NULL,
  worker_name  TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  product_id   TEXT,
  severity     TEXT NOT NULL DEFAULT 'MEDIUM',
  description  TEXT NOT NULL,
  metadata     JSONB,
  resolved     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_scan_id  ON audit_findings (scan_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_resolved ON audit_findings (resolved);

-- audit_fixes
CREATE TABLE IF NOT EXISTS audit_fixes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id       TEXT NOT NULL,
  finding_id    UUID NOT NULL,
  fix_sql       TEXT NOT NULL,
  is_dry_run    BOOLEAN NOT NULL DEFAULT TRUE,
  applied       BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at    TIMESTAMPTZ,
  rows_affected INTEGER DEFAULT 0,
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_fixes_scan_id    ON audit_fixes (scan_id);
CREATE INDEX IF NOT EXISTS idx_audit_fixes_finding_id ON audit_fixes (finding_id);

-- audit_logs (immutable audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        TEXT NOT NULL,
  finding_id    UUID NOT NULL,
  fix_id        UUID NOT NULL,
  fix_sql       TEXT NOT NULL,
  before_state  JSONB,
  after_state   JSONB,
  success       BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_job_id     ON audit_logs (job_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_finding_id ON audit_logs (finding_id);
`;

export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(CREATE_TABLES_SQL);
    await client.query('COMMIT');
    console.info('[audit:migrate] Audit tables created/verified.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
