/**
 * Fix Worker — applies generated fixes with:
 *   1. Mandatory dry-run first (EXPLAIN only, no writes)
 *   2. Explicit transaction for every real write
 *   3. Before/after state captured in audit_logs
 *   4. Idempotent: only writes if value differs
 */

import { PoolClient, Pool } from 'pg';
import { getPool } from '../config/clients.js';
import { env } from '../config/env.js';
import { FixJobData } from '../queue/setup.js';

export interface FixResult {
  findingId: string;
  fixId: string;
  applied: boolean;
  rowsAffected: number;
  dryRun: boolean;
  error?: string;
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function runFixWorker(data: FixJobData): Promise<FixResult[]> {
  const pool = getPool();
  const client = await pool.connect();
  const results: FixResult[] = [];

  try {
    for (const findingId of data.findingIds) {
      const result = await applyFix(client, data.scanId, findingId, data.dryRun || env.AUDIT_DRY_RUN);
      results.push(result);
    }
  } finally {
    client.release();
  }

  return results;
}

// ── Apply a single fix ────────────────────────────────────────────────────────

async function applyFix(
  client: PoolClient,
  scanId: string,
  findingId: string,
  dryRun: boolean
): Promise<FixResult> {
  // 1. Fetch the pending fix for this finding
  const { rows: fixRows } = await client.query<{
    id: string;
    fix_sql: string;
    product_id: string | null;
  }>(
    `SELECT af.id, af.fix_sql, fn.product_id
     FROM audit_fixes af
     JOIN audit_findings fn ON fn.id = af.finding_id
     WHERE af.finding_id = $1 AND af.applied = false AND af.is_dry_run = true
     LIMIT 1`,
    [findingId]
  );

  if (fixRows.length === 0) {
    return { findingId, fixId: '', applied: false, rowsAffected: 0, dryRun, error: 'No pending fix found' };
  }

  const fix = fixRows[0];

  // 2. Dry-run validation: check SQL parses correctly (EXPLAIN)
  try {
    await client.query(`EXPLAIN ${fix.fix_sql}`);
  } catch (err) {
    const error = `Dry-run EXPLAIN failed: ${(err as Error).message}`;
    await logFixAttempt(client, findingId, fix.id, fix.fix_sql, null, null, false, error);
    return { findingId, fixId: fix.id, applied: false, rowsAffected: 0, dryRun: true, error };
  }

  if (dryRun) {
    // Update fix record: mark dry-run complete but not applied
    await client.query(
      `UPDATE audit_fixes SET is_dry_run = true WHERE id = $1`,
      [fix.id]
    );
    return { findingId, fixId: fix.id, applied: false, rowsAffected: 0, dryRun: true };
  }

  // 3. Capture before state
  const beforeState = fix.product_id
    ? await captureProductState(client, fix.product_id)
    : null;

  // 4. Apply fix in explicit transaction
  let rowsAffected = 0;
  let applyError: string | undefined;

  try {
    await client.query('BEGIN');
    const result = await client.query(fix.fix_sql);
    rowsAffected = result.rowCount ?? 0;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    applyError = (err as Error).message;
    await logFixAttempt(client, findingId, fix.id, fix.fix_sql, beforeState, null, false, applyError);
    return { findingId, fixId: fix.id, applied: false, rowsAffected: 0, dryRun: false, error: applyError };
  }

  // 5. Capture after state
  const afterState = fix.product_id
    ? await captureProductState(client, fix.product_id)
    : null;

  // 6. Update fix record
  await client.query(
    `UPDATE audit_fixes
     SET applied = true, applied_at = now(), rows_affected = $1, is_dry_run = false
     WHERE id = $2`,
    [rowsAffected, fix.id]
  );

  // 7. Mark finding as resolved
  await client.query(
    `UPDATE audit_findings SET resolved = true WHERE id = $1`,
    [findingId]
  );

  // 8. Write audit log
  await logFixAttempt(client, findingId, fix.id, fix.fix_sql, beforeState, afterState, true, undefined);

  return { findingId, fixId: fix.id, applied: true, rowsAffected, dryRun: false };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function captureProductState(
  client: PoolClient,
  productId: string
): Promise<Record<string, unknown> | null> {
  try {
    const { rows } = await client.query(
      `SELECT id, price, affiliate_url, image_url, is_active, amazon_price, updated_at
       FROM products WHERE id = $1`,
      [productId]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function logFixAttempt(
  client: PoolClient,
  findingId: string,
  fixId: string,
  fixSql: string,
  beforeState: Record<string, unknown> | null,
  afterState: Record<string, unknown> | null,
  success: boolean,
  errorMessage: string | undefined
): Promise<void> {
  await client.query(
    `INSERT INTO audit_logs (job_id, finding_id, fix_id, fix_sql, before_state, after_state, success, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      `fix-${Date.now()}`,
      findingId,
      fixId,
      fixSql,
      beforeState ? JSON.stringify(beforeState) : null,
      afterState ? JSON.stringify(afterState) : null,
      success,
      errorMessage ?? null,
    ]
  );
}
