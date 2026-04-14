/**
 * Integration test — simulates 3 audit iterations with a mock DB.
 * Tests convergence logic, risk evaluation, and output schema validity.
 * Does NOT require a real DB or Redis connection.
 */

import { computeRiskLevel, computeExpectedPrice, THRESHOLDS } from '../src/config/thresholds';
import { evaluateRisk } from '../src/aggregator/risk-evaluator';
import { mergeResults } from '../src/aggregator/merge-results';
import type { MergedResults } from '../src/aggregator/merge-results';
import type { ScanResult } from '../src/workers/scanner';
import type { PerformanceResult } from '../src/workers/performance';
import type { AuditOutput } from '../src/main';

// ── Mock DB client ─────────────────────────────────────────────────────────────

function makeMockClient(findingCounts: Record<string, number>) {
  return {
    query: jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
      // Simulate mergeResults query: finding_type counts
      if (typeof sql === 'string' && sql.includes('GROUP BY finding_type')) {
        const rows = Object.entries(findingCounts).map(([finding_type, count]) => ({
          finding_type,
          cnt: String(count),
        }));
        return Promise.resolve({ rows });
      }
      return Promise.resolve({ rows: [] });
    }),
  };
}

// ── Helper: build a MergedResults snapshot ────────────────────────────────────

function buildMerged(overrides: Partial<MergedResults> = {}): MergedResults {
  return {
    activeValidProducts: 100,
    revenueLeaksFound: 10,
    affiliateTagMissing: 3,
    marginErrors: 2,
    placeholderErrors: 5,
    indexHitRate: '100%',
    avgQueryTimeMs: 45,
    ...overrides,
  };
}

// ── Simulated 3-iteration convergence ─────────────────────────────────────────

describe('Audit convergence simulation (3 iterations)', () => {
  const scanId = 'test-scan-001';

  // Iteration states: revenue leaks drop from 25 (HIGH) → 8 (MEDIUM) → 0 (LOW/converged)
  // Thresholds: >= 50 CRITICAL, >= 20 HIGH, >= 5 MEDIUM, < 5 LOW
  const iterationStates: MergedResults[] = [
    buildMerged({ revenueLeaksFound: 25, affiliateTagMissing: 5, marginErrors: 3 }),
    buildMerged({ revenueLeaksFound: 8, affiliateTagMissing: 2, marginErrors: 1 }),
    buildMerged({ revenueLeaksFound: 0, affiliateTagMissing: 0, marginErrors: 0 }),
  ];

  let outputs: AuditOutput[] = [];

  beforeAll(() => {
    // Simulate the convergence loop producing outputs
    let prevLeaks = Infinity;
    let totalFixes = 0;

    for (let i = 0; i < iterationStates.length; i++) {
      const state = iterationStates[i];
      const iteration = i + 1;
      const risk = evaluateRisk(state, iteration, 0);
      const fixesThisIteration = Math.max(0, (iterationStates[i - 1]?.revenueLeaksFound ?? state.revenueLeaksFound) - state.revenueLeaksFound);
      totalFixes += fixesThisIteration;

      let converged = false;
      if (state.revenueLeaksFound === 0) converged = true;
      if (risk.riskLevel === 'LOW') converged = true;
      if (prevLeaks < Infinity) {
        const deltaPct = ((prevLeaks - state.revenueLeaksFound) / prevLeaks) * 100;
        if (deltaPct < THRESHOLDS.MIN_DELTA_PCT) converged = true;
      }
      prevLeaks = state.revenueLeaksFound;

      const output: AuditOutput = {
        scan_id: scanId,
        iteration,
        audit_results: {
          active_valid_products: state.activeValidProducts,
          revenue_leaks_found: state.revenueLeaksFound,
          affiliate_tag_missing: state.affiliateTagMissing,
          margin_errors: state.marginErrors,
          placeholder_errors: state.placeholderErrors,
        },
        financial_impact: {
          potential_lost_value_eur: risk.potentialLostValueEur,
          risk_level: risk.riskLevel,
        },
        query_performance: {
          index_hit_rate: state.indexHitRate,
          avg_query_time_ms: state.avgQueryTimeMs,
        },
        fixes_applied: totalFixes,
        converged,
        next_step: risk.nextStep,
      };
      outputs.push(output);
    }
  });

  test('produces exactly 3 iteration outputs', () => {
    expect(outputs).toHaveLength(3);
  });

  test('iteration 1: HIGH risk (25 leaks >= 20), not converged', () => {
    const out = outputs[0];
    expect(out.iteration).toBe(1);
    expect(out.audit_results.revenue_leaks_found).toBe(25);
    // 25 leaks: >= HIGH threshold (20) → HIGH
    expect(out.financial_impact.risk_level).toBe('HIGH');
    expect(out.converged).toBe(false);
    expect(out.next_step).toBe('STOP_AND_FIX');
  });

  test('iteration 2: MEDIUM risk (8 leaks, 5 <= x < 20), not converged', () => {
    const out = outputs[1];
    expect(out.iteration).toBe(2);
    expect(out.audit_results.revenue_leaks_found).toBe(8);
    // 8 leaks: >= MEDIUM threshold (5), below HIGH (20) → MEDIUM
    expect(out.financial_impact.risk_level).toBe('MEDIUM');
    expect(out.converged).toBe(false);
  });

  test('iteration 3: LOW risk, converged, zero leaks', () => {
    const out = outputs[2];
    expect(out.iteration).toBe(3);
    expect(out.audit_results.revenue_leaks_found).toBe(0);
    expect(out.financial_impact.risk_level).toBe('LOW');
    expect(out.converged).toBe(true);
    expect(out.next_step).toBe('PROCEED_TO_DEPLOY');
  });

  test('total fixes applied grows across iterations', () => {
    expect(outputs[2].fixes_applied).toBeGreaterThanOrEqual(outputs[0].fixes_applied);
  });

  test('output schema matches required structure', () => {
    const out = outputs[2];
    expect(out).toHaveProperty('scan_id');
    expect(out).toHaveProperty('iteration');
    expect(out).toHaveProperty('audit_results.active_valid_products');
    expect(out).toHaveProperty('audit_results.revenue_leaks_found');
    expect(out).toHaveProperty('audit_results.affiliate_tag_missing');
    expect(out).toHaveProperty('audit_results.margin_errors');
    expect(out).toHaveProperty('audit_results.placeholder_errors');
    expect(out).toHaveProperty('financial_impact.potential_lost_value_eur');
    expect(out).toHaveProperty('financial_impact.risk_level');
    expect(out).toHaveProperty('query_performance.index_hit_rate');
    expect(out).toHaveProperty('query_performance.avg_query_time_ms');
    expect(out).toHaveProperty('fixes_applied');
    expect(out).toHaveProperty('converged');
    expect(out).toHaveProperty('next_step');
  });
});

// ── Unit tests for thresholds / business rules ────────────────────────────────

describe('computeRiskLevel', () => {
  test('0 leaks → LOW', () => expect(computeRiskLevel(0)).toBe('LOW'));
  test('4 leaks → LOW', () => expect(computeRiskLevel(4)).toBe('LOW'));
  test('5 leaks → MEDIUM', () => expect(computeRiskLevel(5)).toBe('MEDIUM'));
  test('19 leaks → MEDIUM', () => expect(computeRiskLevel(19)).toBe('MEDIUM'));
  test('20 leaks → HIGH', () => expect(computeRiskLevel(20)).toBe('HIGH'));
  test('49 leaks → HIGH', () => expect(computeRiskLevel(49)).toBe('HIGH'));
  test('50 leaks → CRITICAL', () => expect(computeRiskLevel(50)).toBe('CRITICAL'));
});

describe('computeExpectedPrice (kitwer26 pricing formula)', () => {
  test('€10 amazon → €12.90', () => {
    // ceil(10 * 1.20) + 0.90 = ceil(12) + 0.90 = 12 + 0.90 = 12.90
    expect(computeExpectedPrice(10)).toBe(12.9);
  });

  test('€15.50 amazon → €19.90', () => {
    // ceil(15.5 * 1.20) + 0.90 = ceil(18.6) + 0.90 = 19 + 0.90 = 19.90
    expect(computeExpectedPrice(15.5)).toBe(19.9);
  });

  test('€25 amazon → €30.90', () => {
    // ceil(25 * 1.20) + 0.90 = ceil(30) + 0.90 = 30 + 0.90 = 30.90
    expect(computeExpectedPrice(25)).toBe(30.9);
  });

  test('price always gives >= 20% margin over amazon_price', () => {
    const amazonPrices = [5, 9.99, 12.50, 25, 49.99, 99.99, 150];
    for (const ap of amazonPrices) {
      const price = computeExpectedPrice(ap);
      const margin = (price - ap) / ap;
      expect(margin).toBeGreaterThanOrEqual(0.20);
    }
  });
});

describe('mergeResults with mock DB client', () => {
  test('defers to DB finding counts when available', async () => {
    const mockClient = makeMockClient({
      revenue_leak: 7,
      missing_affiliate_tag: 2,
      margin_error: 3,
      placeholder_image: 1,
    }) as any;

    const scan: ScanResult = {
      activeValidProducts: 50,
      revenueLeaks: 99, // should be overridden by DB
      affiliateTagMissing: 99,
      marginErrors: 99,
      placeholderErrors: 99,
      indexHitRate: '100%',
      avgQueryTimeMs: 30,
    };

    const perf: PerformanceResult = {
      indexHitRate: '100%',
      avgQueryTimeMs: 20,
      missingIndexes: [],
      findings: [],
    };

    const result = await mergeResults(mockClient, 'scan-x', 'run-x', scan, perf);

    expect(result.revenueLeaksFound).toBe(7);
    expect(result.affiliateTagMissing).toBe(2);
    expect(result.marginErrors).toBe(3);
    expect(result.placeholderErrors).toBe(1);
    expect(result.activeValidProducts).toBe(50); // unchanged
  });
});

describe('evaluateRisk escalation logic', () => {
  test('CRITICAL risk after 3 iterations → escalateToHuman = true', () => {
    const merged = buildMerged({ revenueLeaksFound: 100 });
    const risk = evaluateRisk(merged, 4, 3);
    expect(risk.escalateToHuman).toBe(true);
    expect(risk.riskLevel).toBe('CRITICAL');
    expect(risk.nextStep).toBe('STOP_AND_FIX');
  });

  test('LOW risk → PROCEED_TO_DEPLOY', () => {
    const merged = buildMerged({ revenueLeaksFound: 0 });
    const risk = evaluateRisk(merged, 1, 0);
    expect(risk.nextStep).toBe('PROCEED_TO_DEPLOY');
    expect(risk.riskLevel).toBe('LOW');
  });
});
