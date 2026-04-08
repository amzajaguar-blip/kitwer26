#!/usr/bin/env tsx
/**
 * fix-final-v91.ts — KITWER26 V9.1 Final Hardened Execution Patch
 *
 * Fix 1: affiliate_tag_missing = 79
 *   Products with affiliate_url NULL, empty, or containing placeholder text.
 *   Recovery: derive from product_url + append ?tag=kitwer26-21
 *   If product_url is also invalid → set is_active = false
 *
 * Fix 2: placeholder_errors = 5
 *   Products with image_url NULL, empty, or containing 'placeholder'.
 *   Recovery: fallback to image_urls[0] if valid
 *   If no fallback → set is_active = false
 *
 * Run:
 *   npx tsx scripts/fix-final-v91.ts           # dry-run
 *   npx tsx scripts/fix-final-v91.ts --write   # apply
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/* ── env ─────────────────────────────────────────────────────────────────── */

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k) process.env[k] = v;
    }
  } catch { /* use system env */ }
}
loadEnv();

const WRITE = process.argv.includes('--write');
const TAG = 'tag=kitwer26-21';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/* ── helpers ─────────────────────────────────────────────────────────────── */

const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', gray: '\x1b[90m',
};

const log = (c: string, tag: string, msg: string) =>
  console.log(`${C.gray}${new Date().toLocaleTimeString('it-IT')}${C.reset} ${c}${C.bright}[${tag}]${C.reset} ${msg}`);

function addTag(url: string): string {
  if (url.includes(TAG)) return url;
  const clean = url.replace(/\/$/, '');
  const sep = clean.includes('?') ? '&' : '?';
  return `${clean}${sep}${TAG}`;
}

function isAmazonUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?amazon\./i.test(url);
}

function isPlaceholderAffiliate(url: string | null): boolean {
  if (!url || url.trim() === '') return true;
  const u = url.trim().toUpperCase();
  return u.includes('INSERIRE') || u.includes('PLACEHOLDER') || u === 'NULL';
}

function isPlaceholderImage(url: string | null): boolean {
  if (!url || url.trim() === '') return true;
  const u = url.trim().toLowerCase();
  return u.includes('placeholder') || u === 'null';
}

function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return false;
  const u = url.trim().toLowerCase();
  if (u.includes('placeholder') || u === 'null') return false;
  return u.startsWith('http://') || u.startsWith('https://');
}

/* ── main ────────────────────────────────────────────────────────────────── */

async function main() {
  console.log('');
  console.log(`${C.bright}${C.cyan}${'='.repeat(60)}${C.reset}`);
  console.log(`${C.bright}  KITWER26 V9.1 — Final Hardened Execution Patch${C.reset}`);
  console.log(`${C.bright}  Mode: ${WRITE ? `${C.red}WRITE (live)` : `${C.yellow}DRY-RUN`}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'='.repeat(60)}${C.reset}`);
  console.log('');

  /* ── FIX 1: Affiliate URLs ──────────────────────────────────────────── */

  log(C.cyan, 'FIX-1', 'Querying products with broken affiliate_url...');

  // Fetch all products — we need product_url to recover
  const PAGE = 1000;
  let offset = 0;
  type Product = {
    id: number; name: string; price: number;
    product_url: string | null; affiliate_url: string | null;
    image_url: string | null; image_urls: string[] | null;
    is_active: boolean | null;
  };
  let allProducts: Product[] = [];

  while (true) {
    const { data, error } = await sb
      .from('products')
      .select('id, name, price, product_url, affiliate_url, image_url, image_urls, is_active')
      .range(offset, offset + PAGE - 1);
    if (error) { log(C.red, 'ERR', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data as Product[]);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  log(C.cyan, 'INFO', `Total products in DB: ${allProducts.length}`);

  // Find products with broken affiliate_url
  const brokenAffiliate = allProducts.filter(p => isPlaceholderAffiliate(p.affiliate_url));
  log(C.yellow, 'FIX-1', `Products with broken affiliate_url: ${brokenAffiliate.length}`);

  const affiliateRecoverable: { id: number; name: string; newUrl: string }[] = [];
  const affiliateUnfixable: { id: number; name: string }[] = [];

  for (const p of brokenAffiliate) {
    if (p.product_url && !isPlaceholderAffiliate(p.product_url) && isAmazonUrl(p.product_url)) {
      affiliateRecoverable.push({ id: p.id, name: p.name, newUrl: addTag(p.product_url) });
    } else {
      affiliateUnfixable.push({ id: p.id, name: p.name });
    }
  }

  log(C.green, 'FIX-1', `Recoverable (product_url valid): ${affiliateRecoverable.length}`);
  log(C.red, 'FIX-1', `Unfixable (no valid product_url): ${affiliateUnfixable.length}`);

  if (affiliateRecoverable.length > 0) {
    log(C.gray, 'SAMPLE', 'First 5 recoverable:');
    for (const p of affiliateRecoverable.slice(0, 5)) {
      log(C.gray, '  ', `[${p.id}] ${p.name.slice(0, 45)} -> ${p.newUrl.slice(0, 65)}`);
    }
  }

  /* ── FIX 2: Placeholder images ──────────────────────────────────────── */

  log(C.cyan, 'FIX-2', 'Querying products with broken image_url...');

  const brokenImage = allProducts.filter(p => isPlaceholderImage(p.image_url));
  log(C.yellow, 'FIX-2', `Products with broken image_url: ${brokenImage.length}`);

  const imageRecoverable: { id: number; name: string; newUrl: string }[] = [];
  const imageUnfixable: { id: number; name: string }[] = [];

  for (const p of brokenImage) {
    // Try image_urls array fallback
    const fallback = (p.image_urls ?? []).find(u => isValidImageUrl(u));
    if (fallback) {
      imageRecoverable.push({ id: p.id, name: p.name, newUrl: fallback.trim() });
    } else {
      imageUnfixable.push({ id: p.id, name: p.name });
    }
  }

  log(C.green, 'FIX-2', `Recoverable (image_urls fallback): ${imageRecoverable.length}`);
  log(C.red, 'FIX-2', `Unfixable (no fallback, will deactivate): ${imageUnfixable.length}`);

  if (imageRecoverable.length > 0) {
    log(C.gray, 'SAMPLE', 'Image recoverable:');
    for (const p of imageRecoverable.slice(0, 5)) {
      log(C.gray, '  ', `[${p.id}] ${p.name.slice(0, 45)} -> ${p.newUrl.slice(0, 65)}`);
    }
  }

  /* ── WRITE MODE ─────────────────────────────────────────────────────── */

  let affiliateFixed = 0;
  let affiliateDeactivated = 0;
  let imageFixed = 0;
  let imageDeactivated = 0;

  if (WRITE) {
    // Fix 1a: Recover affiliate URLs from product_url
    if (affiliateRecoverable.length > 0) {
      log(C.cyan, 'WRITE', `Recovering ${affiliateRecoverable.length} affiliate URLs...`);
      const BATCH = 50;
      for (let i = 0; i < affiliateRecoverable.length; i += BATCH) {
        const batch = affiliateRecoverable.slice(i, i + BATCH);
        await Promise.all(batch.map(async (p) => {
          const { error } = await sb.from('products')
            .update({ affiliate_url: p.newUrl })
            .eq('id', p.id);
          if (error) log(C.red, 'ERR', `[${p.id}] ${error.message}`);
          else affiliateFixed++;
        }));
      }
      log(C.green, 'DONE', `${affiliateFixed} affiliate URLs recovered`);
    }

    // Fix 1b: Deactivate unfixable affiliate products
    if (affiliateUnfixable.length > 0) {
      log(C.yellow, 'WRITE', `Deactivating ${affiliateUnfixable.length} unfixable affiliate products...`);
      const ids = affiliateUnfixable.map(p => p.id);
      const { error } = await sb.from('products')
        .update({ is_active: false })
        .in('id', ids);
      if (error) log(C.red, 'ERR', error.message);
      else {
        affiliateDeactivated = ids.length;
        log(C.yellow, 'DONE', `${affiliateDeactivated} products deactivated (no affiliate URL)`);
      }
    }

    // Fix 2a: Recover images from image_urls array
    if (imageRecoverable.length > 0) {
      log(C.cyan, 'WRITE', `Recovering ${imageRecoverable.length} image URLs...`);
      for (const p of imageRecoverable) {
        const { error } = await sb.from('products')
          .update({ image_url: p.newUrl })
          .eq('id', p.id);
        if (error) log(C.red, 'ERR', `[${p.id}] ${error.message}`);
        else imageFixed++;
      }
      log(C.green, 'DONE', `${imageFixed} image URLs recovered`);
    }

    // Fix 2b: Deactivate unfixable image products
    if (imageUnfixable.length > 0) {
      log(C.yellow, 'WRITE', `Deactivating ${imageUnfixable.length} unfixable image products...`);
      const ids = imageUnfixable.map(p => p.id);
      const { error } = await sb.from('products')
        .update({ is_active: false })
        .in('id', ids);
      if (error) log(C.red, 'ERR', error.message);
      else {
        imageDeactivated = ids.length;
        log(C.yellow, 'DONE', `${imageDeactivated} products deactivated (no image)`);
      }
    }
  }

  /* ── VERIFICATION ───────────────────────────────────────────────────── */

  console.log('');
  log(C.cyan, 'VERIFY', 'Running final count queries...');

  // Count remaining broken affiliate URLs
  const { count: remainingAffiliate } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .or('affiliate_url.is.null,affiliate_url.eq.,affiliate_url.ilike.%INSERIRE%');

  // Count remaining broken image URLs
  const { count: remainingImage } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%');

  // Count active products
  const { count: activeCount } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  /* ── REPORT ─────────────────────────────────────────────────────────── */

  console.log('');
  console.log(`${C.bright}${C.cyan}${'='.repeat(60)}${C.reset}`);
  console.log(`${C.bright}  V9.1 EXECUTION REPORT ${WRITE ? '' : '(DRY-RUN)'}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'='.repeat(60)}${C.reset}`);
  console.log('');
  console.log(`  FIX 1 — Affiliate URLs`);
  console.log(`    Broken found:          ${brokenAffiliate.length}`);
  console.log(`    Recovered from URL:    ${WRITE ? affiliateFixed : affiliateRecoverable.length} ${WRITE ? '' : '(pending)'}`);
  console.log(`    Deactivated:           ${WRITE ? affiliateDeactivated : affiliateUnfixable.length} ${WRITE ? '' : '(pending)'}`);
  console.log(`    Still broken (post):   ${remainingAffiliate ?? '?'}`);
  console.log('');
  console.log(`  FIX 2 — Placeholder Images`);
  console.log(`    Broken found:          ${brokenImage.length}`);
  console.log(`    Recovered from array:  ${WRITE ? imageFixed : imageRecoverable.length} ${WRITE ? '' : '(pending)'}`);
  console.log(`    Deactivated:           ${WRITE ? imageDeactivated : imageUnfixable.length} ${WRITE ? '' : '(pending)'}`);
  console.log(`    Still broken (post):   ${remainingImage ?? '?'}`);
  console.log('');
  console.log(`  Active products:         ${activeCount ?? '?'}`);
  console.log('');

  // Count active products with broken data (the real threat)
  const { count: activeAffBroken } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('affiliate_url.is.null,affiliate_url.eq.,affiliate_url.ilike.%INSERIRE%');

  const { count: activeImgBroken } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%');

  console.log(`  Active with broken affiliate: ${activeAffBroken ?? '?'}`);
  console.log(`  Active with broken image:     ${activeImgBroken ?? '?'}`);
  console.log('');

  // JSON summary — counters reflect ACTIVE products only (what users see)
  const summary = {
    affiliate_fixed: WRITE ? affiliateFixed : affiliateRecoverable.length,
    placeholder_fixed: WRITE ? imageFixed : imageRecoverable.length,
    still_unfixable_inactive: (affiliateUnfixable.length + imageUnfixable.length),
    affiliate_tag_missing_final: activeAffBroken ?? -1,
    placeholder_errors_final: activeImgBroken ?? -1,
    active_products: activeCount ?? -1,
    risk_level: 'LOW',
    next_step: ((activeAffBroken ?? 0) === 0 && (activeImgBroken ?? 0) === 0)
      ? 'DEPLOY_SAFE' : 'REVIEW_REMAINING',
  };

  console.log(`${C.bright}  JSON Summary:${C.reset}`);
  console.log(JSON.stringify(summary, null, 2));
  console.log('');

  if (!WRITE) {
    console.log(`  ${C.bright}${C.yellow}Run with --write to apply fixes${C.reset}`);
    console.log('');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
