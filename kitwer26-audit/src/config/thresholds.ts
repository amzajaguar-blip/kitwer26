/**
 * Audit thresholds and kitwer26-specific business rules.
 */

export const THRESHOLDS = {
  /** Minimum margin percentage required on every product */
  MIN_MARGIN_PCT: 20,

  /** Required affiliate tag in affiliate_url */
  AFFILIATE_TAG: 'tag=kitwer26-21',

  /** Valid Amazon domain regex */
  AMAZON_URL_REGEX: /^https:\/\/www\.amazon\.(it|de|fr|es|co\.uk|com)\//,

  /** Pricing formula: ceil(amazonBase * 1.20) + 0.90 */
  MARKUP_MULTIPLIER: 1.2,
  PRICE_SUFFIX: 0.9,

  /** Risk level thresholds (revenue_leaks count) */
  RISK: {
    CRITICAL: 50,   // >= 50 leaks → CRITICAL
    HIGH: 20,       // >= 20 leaks → HIGH
    MEDIUM: 5,      // >= 5  leaks → MEDIUM
    // < 5 leaks → LOW
  },

  /** Convergence */
  MAX_ITERATIONS: 5,
  MIN_DELTA_PCT: 1,        // stop if improvement < 1% between iterations
  ESCALATE_AFTER: 3,       // escalate to human if CRITICAL after N loops

  /** BullMQ retry policy */
  WORKER_RETRY_LIMIT: 3,
  WORKER_BACKOFF_DELAY_MS: 2000,
} as const;

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export function computeRiskLevel(revenueLeaks: number): RiskLevel {
  if (revenueLeaks >= THRESHOLDS.RISK.CRITICAL) return 'CRITICAL';
  if (revenueLeaks >= THRESHOLDS.RISK.HIGH) return 'HIGH';
  if (revenueLeaks >= THRESHOLDS.RISK.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/** Kitwer26 pricing formula */
export function computeExpectedPrice(amazonBase: number): number {
  return Math.ceil(amazonBase * THRESHOLDS.MARKUP_MULTIPLIER) + THRESHOLDS.PRICE_SUFFIX;
}
