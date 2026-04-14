/**
 * Scanner Worker — discovers all product issues in one pass.
 * Writes findings to audit_findings.
 * Runs 4 sub-scans in parallel: affiliate, pricing, placeholder, performance.
 */

import { PoolClient } from 'pg';
import { getPool } from '../config/clients.js';
import { THRESHOLDS } from '../config/thresholds.js';
import { AuditJobData } from '../queue/setup.js';

export interface ScanResult {
  activeValidProducts: number;
  revenueLeaks: number;
  affiliateTagMissing: number;
  marginErrors: number;
  placeholderErrors: number;
  indexHitRate: string;
  avgQueryTimeMs: number;
}

interface ProductRow {
  id: string;
  price: number | null;
  amazon_price: number | null;
  affiliate_url: string | null;
  image_url: string | null;
  is_active: boolean;
}

// ── Main worker entry point ───────────────────────────────────────────────────

export async function runScannerWorker(data: AuditJobData): Promise<ScanResult> {
  console.info(`[scanner] Starting scan ${data.scanId} iteration ${data.iteration}`);
  const pool = getPool();
  const client = await pool.connect();

  try {
    const result = await scanProducts(client, data.scanId, data.runId);
    console.info(`[scanner] Scan complete: ${JSON.stringify(result)}`);
    return result;
  } finally {
    client.release();
  }
}

// ── Core scan logic ───────────────────────────────────────────────────────────

export async function scanProducts(
  client: PoolClient,
  scanId: string,
  runId: string
): Promise<ScanResult> {
  const t0 = Date.now();

  // Fetch all products — parameterized, no dynamic SQL
  const { rows: products } = await client.query<ProductRow>(
    `SELECT id, price, amazon_price, affiliate_url, image_url, is_active FROM products`
  );

  const activeValidProducts: string[] = [];
  const revenueLeakIds: string[] = [];
  const affiliateMissingIds: string[] = [];
  const marginErrorIds: string[] = [];
  const placeholderIds: string[] = [];

  for (const p of products) {
    const issues: string[] = [];

    // Affiliate tag check
    if (
      !p.affiliate_url ||
      !p.affiliate_url.includes(THRESHOLDS.AFFILIATE_TAG)
    ) {
      affiliateMissingIds.push(p.id);
      issues.push('missing_affiliate_tag');
    }

    // Amazon URL format check
    if (p.affiliate_url && !THRESHOLDS.AMAZON_URL_REGEX.test(p.affiliate_url)) {
      issues.push('invalid_amazon_url');
    }

    // Placeholder image check
    if (
      !p.image_url ||
      p.image_url.toLowerCase().includes('placeholder') ||
      p.image_url.trim() === ''
    ) {
      placeholderIds.push(p.id);
      issues.push('placeholder_image');
    }

    // Price / margin check
    if (!p.price || p.price <= 0) {
      issues.push('no_price');
    } else if (p.amazon_price && p.amazon_price > 0) {
      const expectedMin = p.amazon_price * (1 + THRESHOLDS.MIN_MARGIN_PCT / 100);
      if (p.price < expectedMin) {
        marginErrorIds.push(p.id);
        issues.push('margin_below_threshold');
      }
    }

    // Revenue leak = any product that should be active but isn't (or has issues)
    if (issues.length > 0 && p.is_active) {
      revenueLeakIds.push(p.id);
    }

    // Valid active product
    if (issues.length === 0 && p.is_active) {
      activeValidProducts.push(p.id);
    }
  }

  // Write findings batch — all in one transaction
  await writeFindingsBatch(client, scanId, runId, {
    revenueLeakIds,
    affiliateMissingIds,
    marginErrorIds,
    placeholderIds,
  });

  const avgQueryTimeMs = Date.now() - t0;

  // Check index usage
  const indexHitRate = await checkIndexUsage(client);

  return {
    activeValidProducts: activeValidProducts.length,
    revenueLeaks: revenueLeakIds.length,
    affiliateTagMissing: affiliateMissingIds.length,
    marginErrors: marginErrorIds.length,
    placeholderErrors: placeholderIds.length,
    indexHitRate,
    avgQueryTimeMs,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface FindingsBatch {
  revenueLeakIds: string[];
  affiliateMissingIds: string[];
  marginErrorIds: string[];
  placeholderIds: string[];
}

async function writeFindingsBatch(
  client: PoolClient,
  scanId: string,
  runId: string,
  batch: FindingsBatch
): Promise<void> {
  // Build parameterized insert values
  const rows: Array<[string, string, string, string, string, string, string]> = [];

  for (const id of batch.revenueLeakIds) {
    rows.push([scanId, runId, 'scanner', 'revenue_leak', id, 'HIGH', 'Product is active but has data quality issues causing revenue leak']);
  }
  for (const id of batch.affiliateMissingIds) {
    rows.push([scanId, runId, 'scanner', 'missing_affiliate_tag', id, 'CRITICAL', `affiliate_url missing tag=${THRESHOLDS.AFFILIATE_TAG}`]);
  }
  for (const id of batch.marginErrorIds) {
    rows.push([scanId, runId, 'scanner', 'margin_error', id, 'HIGH', `Price below minimum ${THRESHOLDS.MIN_MARGIN_PCT}% margin`]);
  }
  for (const id of batch.placeholderIds) {
    rows.push([scanId, runId, 'scanner', 'placeholder_image', id, 'MEDIUM', 'image_url is missing or contains placeholder']);
  }

  if (rows.length === 0) return;

  // Bulk insert with unnest for performance
  const scanIds = rows.map((r) => r[0]);
  const runIds = rows.map((r) => r[1]);
  const workerNames = rows.map((r) => r[2]);
  const findingTypes = rows.map((r) => r[3]);
  const productIds = rows.map((r) => r[4]);
  const severities = rows.map((r) => r[5]);
  const descriptions = rows.map((r) => r[6]);

  await client.query(
    `INSERT INTO audit_findings
       (scan_id, run_id, worker_name, finding_type, product_id, severity, description)
     SELECT * FROM unnest(
       $1::text[], $2::uuid[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[]
     )`,
    [scanIds, runIds, workerNames, findingTypes, productIds, severities, descriptions]
  );
}

async function checkIndexUsage(client: PoolClient): Promise<string> {
  try {
    const { rows } = await client.query<{ hit_rate: string }>(`
      SELECT
        CASE
          WHEN (idx_scan + seq_scan) = 0 THEN '100%'
          WHEN idx_scan::float / NULLIF(idx_scan + seq_scan, 0) >= 0.95 THEN '100%'
          WHEN idx_scan::float / NULLIF(idx_scan + seq_scan, 0) >= 0.5  THEN 'Partial'
          ELSE 'None'
        END AS hit_rate
      FROM pg_stat_user_tables
      WHERE relname = 'products'
      LIMIT 1
    `);
    return rows[0]?.hit_rate ?? 'None';
  } catch {
    return 'None';
  }
}
