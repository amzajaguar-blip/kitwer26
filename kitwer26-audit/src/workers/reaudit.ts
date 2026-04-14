/**
 * Re-audit Worker — triggered after fixes are applied.
 * Runs a new scan iteration and checks if convergence is reached.
 */

import { getPool } from '../config/clients.js';
import { THRESHOLDS } from '../config/thresholds.js';
import { RecheckJobData } from '../queue/setup.js';
import { scanProducts } from './scanner.js';
import { ScanResult } from './scanner.js';

export interface ReauditResult {
  scanId: string;
  iteration: number;
  result: ScanResult;
  converged: boolean;
  reason: string;
}

export async function runReauditWorker(data: RecheckJobData): Promise<ReauditResult> {
  console.info(`[reaudit] Re-auditing scan ${data.scanId} iteration ${data.iteration}`);

  const pool = getPool();
  const client = await pool.connect();

  try {
    // Create a new run_id for this iteration
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO audit_runs (scan_id, iteration, status)
       VALUES ($1, $2, 'running')
       RETURNING id`,
      [data.scanId, data.iteration]
    );
    const newRunId = rows[0].id;

    // Run fresh scan
    const result = await scanProducts(client, data.scanId, newRunId);

    // Fetch previous iteration results for delta calculation
    const { rows: prevRows } = await client.query<{ revenue_leaks_found: string }>(
      `SELECT revenue_leaks_found FROM audit_runs
       WHERE scan_id = $1 AND id = $2`,
      [data.scanId, data.previousRunId]
    );

    const prevLeaks = parseInt(prevRows[0]?.revenue_leaks_found ?? '0', 10);
    const currentLeaks = result.revenueLeaks;

    // Convergence check
    let converged = false;
    let reason = '';

    if (currentLeaks === 0) {
      converged = true;
      reason = 'All revenue leaks resolved';
    } else if (prevLeaks > 0) {
      const deltaPct = ((prevLeaks - currentLeaks) / prevLeaks) * 100;
      if (deltaPct < THRESHOLDS.MIN_DELTA_PCT) {
        converged = true;
        reason = `Improvement delta ${deltaPct.toFixed(2)}% below threshold ${THRESHOLDS.MIN_DELTA_PCT}%`;
      }
    } else if (data.iteration >= THRESHOLDS.MAX_ITERATIONS) {
      converged = true;
      reason = `Max iterations (${THRESHOLDS.MAX_ITERATIONS}) reached`;
    }

    // Update run record
    await client.query(
      `UPDATE audit_runs SET
         status = $1,
         revenue_leaks_found = $2,
         active_valid_products = $3,
         converged = $4,
         completed_at = now()
       WHERE id = $5`,
      [
        converged ? 'converged' : 'running',
        currentLeaks,
        result.activeValidProducts,
        converged,
        newRunId,
      ]
    );

    return {
      scanId: data.scanId,
      iteration: data.iteration,
      result,
      converged,
      reason,
    };
  } finally {
    client.release();
  }
}
