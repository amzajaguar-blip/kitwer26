/**
 * Affiliate Worker — generates idempotent SQL fixes for missing affiliate tags.
 * Does NOT apply fixes — only generates fix SQL for the aggregator.
 */

import { PoolClient } from 'pg';
import { THRESHOLDS } from '../config/thresholds.js';

export interface AffiliateFix {
  productId: string;
  currentUrl: string | null;
  fixSql: string;
  description: string;
}

/**
 * For each product with a missing or malformed tag, generate an idempotent
 * UPDATE that appends the tag if the URL is otherwise valid.
 * Products with fully invalid URLs are flagged but NOT auto-fixed (human needed).
 */
export async function generateAffiliateFixes(
  client: PoolClient,
  scanId: string
): Promise<AffiliateFix[]> {
  // Fetch findings of type missing_affiliate_tag for this scan
  const { rows } = await client.query<{
    product_id: string;
    affiliate_url: string | null;
  }>(
    `SELECT DISTINCT f.product_id, p.affiliate_url
     FROM audit_findings f
     JOIN products p ON p.id::text = f.product_id
     WHERE f.scan_id = $1
       AND f.finding_type = 'missing_affiliate_tag'
       AND f.resolved = false`,
    [scanId]
  );

  const fixes: AffiliateFix[] = [];

  for (const row of rows) {
    const url = row.affiliate_url;
    if (!url) continue;

    // Only auto-fix if URL is a valid Amazon URL — just missing the tag
    if (!THRESHOLDS.AMAZON_URL_REGEX.test(url)) {
      // Cannot auto-fix — URL doesn't match Amazon pattern
      fixes.push({
        productId: row.product_id,
        currentUrl: url,
        fixSql: '', // empty = no auto-fix, needs human review
        description: `URL does not match Amazon pattern — manual review required`,
      });
      continue;
    }

    const separator = url.includes('?') ? '&' : '?';
    const newUrl = `${url}${separator}${THRESHOLDS.AFFILIATE_TAG}`;

    // Idempotent: only update if affiliate_url doesn't already have the tag
    const fixSql = `UPDATE products SET affiliate_url = '${newUrl.replace(/'/g, "''")}', updated_at = now() WHERE id = '${row.product_id}' AND affiliate_url NOT LIKE '%${THRESHOLDS.AFFILIATE_TAG}%'`;

    fixes.push({
      productId: row.product_id,
      currentUrl: url,
      fixSql,
      description: `Append ${THRESHOLDS.AFFILIATE_TAG} to affiliate_url`,
    });
  }

  return fixes;
}
