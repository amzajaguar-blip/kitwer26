/**
 * Kitwer26 Autonomous Audit System — Main Orchestrator
 *
 * Convergence loop:
 *   SCAN → AGGREGATE → FIX (dry-run → apply) → RE-AUDIT → repeat
 *   until: risk_level == LOW  OR  revenue_leaks == 0  OR  max_iterations reached
 *
 * Emits strict JSON to stdout matching the required output schema.
 */

import { randomUUID } from 'crypto';
import { env } from './config/env.js';
import { getPool, closePool, closeRedis } from './config/clients.js';
import { THRESHOLDS, computeRiskLevel, RiskLevel } from './config/thresholds.js';
import { runMigrations } from './db/migrate.js';
import { scanProducts } from './workers/scanner.js';
import { runPerformanceWorker } from './workers/performance.js';
import { mergeResults } from './aggregator/merge-results.js';
import { evaluateRisk } from './aggregator/risk-evaluator.js';
import { generateAndStoreFixes } from './aggregator/fix-generator.js';
import { runFixWorker } from './workers/fix.js';

// ── Output schema (strict) ────────────────────────────────────────────────────

export interface AuditOutput {
  scan_id: string;
  iteration: number;
  audit_results: {
    active_valid_products: number;
    revenue_leaks_found: number;
    affiliate_tag_missing: number;
    margin_errors: number;
    placeholder_errors: number;
  };
  financial_impact: {
    potential_lost_value_eur: number;
    risk_level: RiskLevel;
  };
  query_performance: {
    index_hit_rate: string;
    avg_query_time_ms: number;
  };
  fixes_applied: number;
  converged: boolean;
  next_step: 'STOP_AND_FIX' | 'PROCEED_TO_DEPLOY';
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function runAudit(scanId?: string): Promise<AuditOutput> {
  const sid = scanId ?? `scan-${randomUUID()}`;
  console.info(`[audit] Starting audit system. scan_id=${sid}`);

  // Startup: env already validated at module load (env.ts)
  await runMigrations();

  const pool = getPool();
  let iteration = 0;
  let criticalIterations = 0;
  let lastOutput: AuditOutput | null = null;
  let prevRevenueLeaks = Infinity;
  let totalFixesApplied = 0;

  while (iteration < env.AUDIT_MAX_LOOPS) {
    iteration++;
    console.info(`\n[audit] ── Iteration ${iteration} / ${env.AUDIT_MAX_LOOPS} ──`);

    const client = await pool.connect();

    try {
      // ── 1. Create run record ──────────────────────────────────────────────
      const { rows: runRows } = await client.query<{ id: string }>(
        `INSERT INTO audit_runs (scan_id, iteration, status)
         VALUES ($1, $2, 'running') RETURNING id`,
        [sid, iteration]
      );
      const runId = runRows[0].id;

      // ── 2. Scan + Performance (parallel) ─────────────────────────────────
      const [scanResult, perfResult] = await Promise.all([
        scanProducts(client, sid, runId),
        runPerformanceWorker(client, sid, runId),
      ]);

      // ── 3. Merge ──────────────────────────────────────────────────────────
      const merged = await mergeResults(client, sid, runId, scanResult, perfResult);

      // ── 4. Risk evaluation ────────────────────────────────────────────────
      const risk = evaluateRisk(merged, iteration, criticalIterations);

      if (risk.riskLevel === 'CRITICAL') criticalIterations++;

      // ── 5. Generate fixes ─────────────────────────────────────────────────
      const generatedFixes = await generateAndStoreFixes(client, sid);
      const findingIds = generatedFixes.map((f) => f.findingId);

      // ── 6. Apply fixes (dry-run first, then real if AUDIT_DRY_RUN=false) ─
      let fixesThisIteration = 0;
      if (findingIds.length > 0) {
        const fixResults = await runFixWorker({
          type: 'fix_job',
          scanId: sid,
          runId,
          findingIds,
          dryRun: env.AUDIT_DRY_RUN,
        });
        fixesThisIteration = fixResults.filter((r) => r.applied).length;
        totalFixesApplied += fixesThisIteration;
      }

      // ── 7. Update run record ──────────────────────────────────────────────
      await client.query(
        `UPDATE audit_runs SET
           status = $1,
           risk_level = $2,
           active_valid_products = $3,
           revenue_leaks_found = $4,
           affiliate_tag_missing = $5,
           margin_errors = $6,
           placeholder_errors = $7,
           potential_lost_value_eur = $8,
           fixes_applied = $9,
           index_hit_rate = $10,
           avg_query_time_ms = $11,
           completed_at = now()
         WHERE id = $12`,
        [
          'completed',
          risk.riskLevel,
          merged.activeValidProducts,
          merged.revenueLeaksFound,
          merged.affiliateTagMissing,
          merged.marginErrors,
          merged.placeholderErrors,
          risk.potentialLostValueEur,
          fixesThisIteration,
          merged.indexHitRate,
          merged.avgQueryTimeMs,
          runId,
        ]
      );

      // ── 8. Build output ───────────────────────────────────────────────────
      lastOutput = {
        scan_id: sid,
        iteration,
        audit_results: {
          active_valid_products: merged.activeValidProducts,
          revenue_leaks_found: merged.revenueLeaksFound,
          affiliate_tag_missing: merged.affiliateTagMissing,
          margin_errors: merged.marginErrors,
          placeholder_errors: merged.placeholderErrors,
        },
        financial_impact: {
          potential_lost_value_eur: risk.potentialLostValueEur,
          risk_level: risk.riskLevel,
        },
        query_performance: {
          index_hit_rate: merged.indexHitRate,
          avg_query_time_ms: merged.avgQueryTimeMs,
        },
        fixes_applied: totalFixesApplied,
        converged: false,
        next_step: risk.nextStep,
      };

      // ── 9. Convergence checks ─────────────────────────────────────────────
      const currentLeaks = merged.revenueLeaksFound;

      // a) No more leaks
      if (currentLeaks === 0) {
        console.info('[audit] Converged: zero revenue leaks.');
        lastOutput.converged = true;
        break;
      }

      // b) Risk is LOW
      if (risk.riskLevel === 'LOW') {
        console.info('[audit] Converged: risk_level = LOW.');
        lastOutput.converged = true;
        break;
      }

      // c) Delta improvement < threshold
      if (prevRevenueLeaks < Infinity) {
        const deltaPct = ((prevRevenueLeaks - currentLeaks) / prevRevenueLeaks) * 100;
        if (deltaPct < env.AUDIT_MIN_DELTA_PCT) {
          console.info(`[audit] Converged: delta ${deltaPct.toFixed(2)}% < ${env.AUDIT_MIN_DELTA_PCT}% threshold.`);
          lastOutput.converged = true;
          break;
        }
      }

      // d) Escalate to human if CRITICAL for 3+ loops
      if (risk.escalateToHuman) {
        console.warn(`[audit] ESCALATE: risk_level CRITICAL for ${criticalIterations} consecutive iterations. Human review required.`);
        lastOutput.next_step = 'STOP_AND_FIX';
        break;
      }

      prevRevenueLeaks = currentLeaks;

    } finally {
      client.release();
    }
  }

  // ── 10. Max iterations cap ────────────────────────────────────────────────
  if (!lastOutput!.converged && iteration >= env.AUDIT_MAX_LOOPS) {
    console.warn(`[audit] Max iterations (${env.AUDIT_MAX_LOOPS}) reached without convergence.`);
    lastOutput!.next_step = 'STOP_AND_FIX';
  }

  // ── 11. Emit strict JSON to stdout ────────────────────────────────────────
  console.log('\n── AUDIT REPORT ──────────────────────────────────────────────');
  console.log(JSON.stringify(lastOutput!, null, 2));

  return lastOutput!;
}

// ── CLI entry point ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  try {
    await runAudit();
  } catch (err) {
    console.error('[audit] Fatal error:', (err as Error).message);
    process.exit(1);
  } finally {
    await closePool();
    await closeRedis();
  }
}

// Run if invoked directly (ESM equivalent of require.main === module)
main();
