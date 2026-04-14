/**
 * Pricing Worker — detects margin errors and generates correction SQL.
 * Formula: ceil(amazon_price * 1.20) + 0.90
 */

import { PoolClient } from 'pg';
import { computeExpectedPrice, THRESHOLDS } from '../config/thresholds.js';

export interface PricingFix {
  productId: string;
  currentPrice: number;
  amazonPrice: number;
  expectedPrice: number;
  fixSql: string;
}

export async function generatePricingFixes(
  client: PoolClient,
  scanId: string
): Promise<PricingFix[]> {
  const { rows } = await client.query<{
    product_id: string;
    price: string;
    amazon_price: string;
  }>(
    `SELECT DISTINCT f.product_id, p.price, p.amazon_price
     FROM audit_findings f
     JOIN products p ON p.id::text = f.product_id
     WHERE f.scan_id = $1
       AND f.finding_type = 'margin_error'
       AND f.resolved = false
       AND p.amazon_price IS NOT NULL
       AND p.amazon_price > 0`,
    [scanId]
  );

  const fixes: PricingFix[] = [];

  for (const row of rows) {
    const currentPrice = parseFloat(row.price);
    const amazonPrice = parseFloat(row.amazon_price);
    const expectedPrice = computeExpectedPrice(amazonPrice);

    if (expectedPrice <= currentPrice) continue; // already ok

    // Idempotent: only update if price is still below expected
    const fixSql = `UPDATE products SET price = ${expectedPrice}, updated_at = now() WHERE id = '${row.product_id}' AND price <> ${expectedPrice}`;

    fixes.push({
      productId: row.product_id,
      currentPrice,
      amazonPrice,
      expectedPrice,
      fixSql,
    });
  }

  return fixes;
}

export function computePotentialLostValue(fixes: PricingFix[]): number {
  return fixes.reduce((sum, f) => {
    const delta = f.expectedPrice - f.currentPrice;
    return sum + (delta > 0 ? delta : 0);
  }, 0);
}

export function estimateTotalRevenueLeak(revenueLeaks: number): number {
  // Conservative estimate: average €5 lost per leaking product
  const AVG_LOSS_PER_PRODUCT_EUR = 5;
  return revenueLeaks * AVG_LOSS_PER_PRODUCT_EUR;
}
