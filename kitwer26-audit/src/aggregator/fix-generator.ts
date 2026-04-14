/**
 * Fix Generator — orchestrates affiliate + pricing fix generation
 * and writes them to audit_fixes table (dry-run mode by default).
 * All fixes are idempotent (WHERE col <> new_value pattern).
 */

import { PoolClient } from 'pg';
import { generateAffiliateFixes } from '../workers/affiliate.js';
import { generatePricingFixes } from '../workers/pricing.js';
import { env } from '../config/env.js';

export interface GeneratedFix {
  findingId: string;
  fixId: string;
  fixSql: string;
  description: string;
  productId: string | null;
}

export async function generateAndStoreFixes(
  client: PoolClient,
  scanId: string
): Promise<GeneratedFix[]> {
  const [affiliateFixes, pricingFixes] = await Promise.all([
    generateAffiliateFixes(client, scanId),
    generatePricingFixes(client, scanId),
  ]);

  const generated: GeneratedFix[] = [];

  // Store affiliate fixes
  for (const fix of affiliateFixes) {
    if (!fix.fixSql) continue; // skip unfixable (needs human review)

    const { rows: findingRows } = await client.query<{ id: string }>(
      `SELECT id FROM audit_findings
       WHERE scan_id = $1 AND product_id = $2 AND finding_type = 'missing_affiliate_tag' AND resolved = false
       LIMIT 1`,
      [scanId, fix.productId]
    );

    if (findingRows.length === 0) continue;
    const findingId = findingRows[0].id;

    const { rows: fixRows } = await client.query<{ id: string }>(
      `INSERT INTO audit_fixes (scan_id, finding_id, fix_sql, is_dry_run)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [scanId, findingId, fix.fixSql, true]
    );

    generated.push({
      findingId,
      fixId: fixRows[0].id,
      fixSql: fix.fixSql,
      description: fix.description,
      productId: fix.productId,
    });
  }

  // Store pricing fixes
  for (const fix of pricingFixes) {
    const { rows: findingRows } = await client.query<{ id: string }>(
      `SELECT id FROM audit_findings
       WHERE scan_id = $1 AND product_id = $2 AND finding_type = 'margin_error' AND resolved = false
       LIMIT 1`,
      [scanId, fix.productId]
    );

    if (findingRows.length === 0) continue;
    const findingId = findingRows[0].id;

    const { rows: fixRows } = await client.query<{ id: string }>(
      `INSERT INTO audit_fixes (scan_id, finding_id, fix_sql, is_dry_run)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [scanId, findingId, fix.fixSql, true]
    );

    generated.push({
      findingId,
      fixId: fixRows[0].id,
      fixSql: fix.fixSql,
      description: `Correct price from €${fix.currentPrice} to €${fix.expectedPrice} (amazon_price €${fix.amazonPrice})`,
      productId: fix.productId,
    });
  }

  return generated;
}
