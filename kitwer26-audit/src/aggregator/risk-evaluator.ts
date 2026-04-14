/**
 * Risk Evaluator — computes risk level and financial impact from merged results.
 */

import { MergedResults } from './merge-results.js';
import { computeRiskLevel, RiskLevel } from '../config/thresholds.js';
import { estimateTotalRevenueLeak } from '../workers/pricing.js';

export interface RiskEvaluation {
  riskLevel: RiskLevel;
  potentialLostValueEur: number;
  nextStep: 'STOP_AND_FIX' | 'PROCEED_TO_DEPLOY';
  escalateToHuman: boolean;
  reasons: string[];
}

export function evaluateRisk(
  merged: MergedResults,
  iteration: number,
  criticalIterations: number
): RiskEvaluation {
  const riskLevel = computeRiskLevel(merged.revenueLeaksFound);
  const potentialLostValueEur = estimateTotalRevenueLeak(merged.revenueLeaksFound);
  const reasons: string[] = [];

  if (merged.revenueLeaksFound > 0) {
    reasons.push(`${merged.revenueLeaksFound} revenue leak(s) detected`);
  }
  if (merged.affiliateTagMissing > 0) {
    reasons.push(`${merged.affiliateTagMissing} product(s) missing affiliate tag`);
  }
  if (merged.marginErrors > 0) {
    reasons.push(`${merged.marginErrors} product(s) with margin below 20%`);
  }
  if (merged.placeholderErrors > 0) {
    reasons.push(`${merged.placeholderErrors} product(s) with placeholder images`);
  }
  if (merged.indexHitRate === 'None') {
    reasons.push('No index usage on products table — severe query performance issue');
  }

  const escalateToHuman = riskLevel === 'CRITICAL' && criticalIterations >= 3;
  const nextStep: 'STOP_AND_FIX' | 'PROCEED_TO_DEPLOY' =
    riskLevel === 'LOW' || merged.revenueLeaksFound === 0
      ? 'PROCEED_TO_DEPLOY'
      : 'STOP_AND_FIX';

  return {
    riskLevel,
    potentialLostValueEur: Math.round(potentialLostValueEur * 100) / 100,
    nextStep,
    escalateToHuman,
    reasons,
  };
}
