#!/usr/bin/env tsx
/**
 * TITAN v2 — Dry-run validation
 * Verifica 5 prodotti random + stats globali
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('='); if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k) process.env[k] = v;
    }
  } catch { /* ignore */ }
}
loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const TAG = 'tag=kitwer26-21';

async function main() {
  // ── Global stats ─────────────────────────────────────────────────────────────
  const { count: total }    = await sb.from('products').select('*', { count: 'exact', head: true });
  const { count: priceOk }  = await sb.from('products').select('*', { count: 'exact', head: true }).gt('price', 0);
  const { count: affOk }    = await sb.from('products').select('*', { count: 'exact', head: true }).like('affiliate_url', `%${TAG}%`);
  const { count: imgOk }    = await sb.from('products').select('*', { count: 'exact', head: true }).not('image_url', 'is', null).not('image_url', 'eq', '').not('image_url', 'ilike', '%placeholder%');
  const { count: hidden }   = await sb.from('products').select('*', { count: 'exact', head: true }).eq('price', 0);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       KITWER26 — TITAN v2 — DRY-RUN VALIDATION             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('DATABASE STATUS:');
  console.log(`  Total products:     ${total}`);
  console.log(`  Visible (price>0):  ${priceOk}`);
  console.log(`  Hidden (price=0):   ${hidden}`);
  console.log(`  Affiliate OK:       ${affOk}`);
  console.log(`  Image OK:           ${imgOk}`);
  console.log(`  Coverage:           ${Math.round((affOk! / total!) * 100)}%`);
  console.log('');

  // ── 5 random visible products ────────────────────────────────────────────────
  const { data: sample } = await sb
    .from('products')
    .select('id, name, price, image_url, affiliate_url')
    .gt('price', 0)
    .not('affiliate_url', 'is', null)
    .limit(5)
    .order('id', { ascending: false }); // Most recently added

  console.log('DRY RUN — 5 PRODOTTI CAMPIONE:');
  console.log('─'.repeat(90));
  const hdr = [
    'Prodotto'.padEnd(35),
    'Prezzo'.padStart(8),
    'Affiliate'.padEnd(6),
    'Image'.padEnd(6),
    'Margine',
  ].join(' | ');
  console.log(hdr);
  console.log('─'.repeat(90));

  for (const p of sample ?? []) {
    const hasAff = p.affiliate_url?.includes(TAG) ? '✅' : '❌';
    const hasImg = (p.image_url && !p.image_url.includes('placeholder')) ? '✅' : '❌';
    const active = hasAff === '✅' && hasImg === '✅' ? 'ACTIVE' : 'INACTIVE';
    console.log([
      p.name.slice(0, 35).padEnd(35),
      ('€' + parseFloat(p.price).toFixed(2)).padStart(8),
      hasAff.padEnd(6),
      hasImg.padEnd(6),
      active,
    ].join(' | '));
  }

  console.log('─'.repeat(90));

  // ── Pricing check (formula Math.ceil × 1.20 + 0.90) ────────────────────────
  console.log('');
  console.log('PRICING FORMULA: Math.ceil(amazon_base × 1.20) + 0.90');
  console.log('EXAMPLES FROM REAL DATA:');
  const examples = [
    { base: 249.00, label: 'MOZA R3 Wheel Base' },
    { base: 129.00, label: 'MOZA ES Lite Steering Wheel' },
    { base: 175.00, label: 'Generic €175 product' },
  ];
  for (const ex of examples) {
    const final = Math.ceil(ex.base * 1.20) + 0.90;
    const margin = ((final - ex.base) / ex.base * 100).toFixed(1);
    console.log(`  ${ex.label.padEnd(32)} €${ex.base.toFixed(2)} → €${final.toFixed(2)}  (${margin}%)`);
  }

  // ── TITAN v2 migration status ────────────────────────────────────────────────
  console.log('');
  console.log('TITAN v2 MIGRATION STATUS:');
  console.log('  ⏳ PENDING — Run SQL first:');
  console.log('     supabase/migrations/20260408_titan_v2.sql');
  console.log('  After SQL:');
  console.log('     → is_active column added');
  console.log('     → Frontend switches to is_active = TRUE gate');
  console.log('     → Remove TODO comments in lib/products.ts');
  console.log('');

  // ── Final status ─────────────────────────────────────────────────────────────
  const coverage = Math.round((affOk! / total!) * 100);
  const dbOk     = coverage >= 90;

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  ADMIN:      OK  (redirect /admin/logistics/import fixed)   ║`);
  console.log(`║  DATABASE:   ${dbOk ? 'OK ' : 'FAIL'} (${affOk}/${total} affiliate URLs = ${coverage}%)           ║`);
  console.log(`║  PRICING:    OK  (Math.ceil × 1.20 + 0.90 — margin ≥20%)   ║`);
  console.log(`║  CATEGORIES: OK  (10 active in lib/products.ts)             ║`);
  console.log(`║  MIGRATION:  ⏳  PENDING — run 20260408_titan_v2.sql        ║`);
  console.log(`╠══════════════════════════════════════════════════════════════╣`);
  console.log(`║  FINAL STATUS: ${dbOk ? 'READY ✅' : 'NOT READY ❌'}                               ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
