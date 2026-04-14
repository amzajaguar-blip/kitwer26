/**
 * Merge Results — combines outputs from all workers into a unified scan snapshot.
 */

import { PoolClient } from 'pg';
import { ScanResult } from '../workers/scanner.js';
import { PerformanceResult } from '../workers/performance.js';

export interface MergedResults {
  activeValidProducts: number;
  revenueLeaksFound: number;
  affiliateTagMissing: number;
  marginErrors: number;
  placeholderErrors: number;
  indexHitRate: string;
  avgQueryTimeMs: number;
}

export async function mergeResults(
  client: PoolClient,
  scanId: string,
  runId: string,
  scan: ScanResult,
  perf: PerformanceResult
): Promise<MergedResults> {
  // Recompute affiliate/margin/placeholder from findings table
  // (authoritative source — workers may have run in parallel)
  const { rows } = await client.query<{
    finding_type: string;
    cnt: string;
  }>(
    `SELECT finding_type, COUNT(*) AS cnt
     FROM audit_findings
     WHERE scan_id = $1 AND run_id = $2 AND resolved = false
     GROUP BY finding_type`,
    [scanId, runId]
  );

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.finding_type] = parseInt(row.cnt, 10);
  }

  return {
    activeValidProducts: scan.activeValidProducts,
    revenueLeaksFound: counts['revenue_leak'] ?? scan.revenueLeaks,
    affiliateTagMissing: counts['missing_affiliate_tag'] ?? scan.affiliateTagMissing,
    marginErrors: counts['margin_error'] ?? scan.marginErrors,
    placeholderErrors: counts['placeholder_image'] ?? scan.placeholderErrors,
    indexHitRate: perf.indexHitRate !== 'None' ? perf.indexHitRate : scan.indexHitRate,
    avgQueryTimeMs: Math.max(scan.avgQueryTimeMs, perf.avgQueryTimeMs),
  };
}
