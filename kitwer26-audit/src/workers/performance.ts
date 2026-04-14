/**
 * Performance Worker — checks query plans and index health on products table.
 */

import { PoolClient } from 'pg';

export interface PerformanceResult {
  indexHitRate: string;
  avgQueryTimeMs: number;
  missingIndexes: string[];
  findings: string[];
}

export async function runPerformanceWorker(
  client: PoolClient,
  scanId: string,
  runId: string
): Promise<PerformanceResult> {
  const t0 = Date.now();
  const missingIndexes: string[] = [];
  const findings: string[] = [];

  // Check index hit rate from pg_stat_user_tables
  const { rows: statRows } = await client.query<{
    relname: string;
    seq_scan: string;
    idx_scan: string;
  }>(
    `SELECT relname, seq_scan, idx_scan
     FROM pg_stat_user_tables
     WHERE relname = 'products'`
  );

  let indexHitRate = 'None';
  if (statRows.length > 0) {
    const seqScan = parseInt(statRows[0].seq_scan ?? '0', 10);
    const idxScan = parseInt(statRows[0].idx_scan ?? '0', 10);
    const total = seqScan + idxScan;
    if (total === 0) {
      indexHitRate = '100%';
    } else {
      const ratio = idxScan / total;
      if (ratio >= 0.95) indexHitRate = '100%';
      else if (ratio >= 0.5) indexHitRate = 'Partial';
      else {
        indexHitRate = 'None';
        findings.push('High sequential scan ratio on products table — index not being used');
      }
    }
  }

  // Check required indexes exist
  const requiredIndexes = [
    'idx_products_active',
    'idx_products_active_category',
    'idx_products_active_budget_king',
  ];

  const { rows: indexRows } = await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'products'`
  );
  const existingIndexes = new Set(indexRows.map((r) => r.indexname));

  for (const idx of requiredIndexes) {
    if (!existingIndexes.has(idx)) {
      missingIndexes.push(idx);
      findings.push(`Missing index: ${idx} — run TITAN v2.2 migration`);
    }
  }

  // Write performance findings to DB
  if (findings.length > 0) {
    const findingRows = findings.map((desc) => ({
      scanId,
      runId,
      workerName: 'performance',
      findingType: 'index_miss',
      severity: 'HIGH',
      description: desc,
    }));

    for (const f of findingRows) {
      await client.query(
        `INSERT INTO audit_findings (scan_id, run_id, worker_name, finding_type, severity, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [f.scanId, f.runId, f.workerName, f.findingType, f.severity, f.description]
      );
    }
  }

  const avgQueryTimeMs = Date.now() - t0;

  return {
    indexHitRate,
    avgQueryTimeMs,
    missingIndexes,
    findings,
  };
}
