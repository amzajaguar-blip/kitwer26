/**
 * scripts/affiliate-audit.mjs
 *
 * Verifica che ogni prodotto con price > 0 abbia un product_url valido
 * e che l'URL sia compatibile con il tag affiliato kitwer26-21.
 *
 * USO:
 *   node scripts/affiliate-audit.mjs
 *
 * PREREQUISITI:
 *   NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *   nel file .env.local oppure nell'ambiente di esecuzione.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local if present ────────────────────────────────────────────────
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on process environment
}

// ── Config ────────────────────────────────────────────────────────────────────

const AFFILIATE_TAG  = 'kitwer26-21';
const AMAZON_PATTERN = /amazon\.(it|com|de|fr|es|co\.uk|co\.jp)/i;
const PAGE_SIZE      = 500;

// ── Supabase client ───────────────────────────────────────────────────────────

const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!sbUrl || !sbKey) {
  console.error('[affiliate-audit] ERRORE: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti.');
  process.exit(1);
}

const supabase = createClient(sbUrl, sbKey);

// ── URL helpers ───────────────────────────────────────────────────────────────

/**
 * Returns true if the URL is a valid Amazon URL.
 */
function isAmazonUrl(url) {
  return AMAZON_PATTERN.test(url);
}

/**
 * Returns true if the URL already contains the affiliate tag.
 */
function hasTag(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get('tag') === AFFILIATE_TAG;
  } catch {
    return url.includes(`tag=${AFFILIATE_TAG}`);
  }
}

/**
 * Returns true if the URL is a well-formed URL (parseable).
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Classify a product_url:
 *  - 'ok'           : Amazon URL, tag already set or can be appended
 *  - 'non-amazon'   : valid URL but not Amazon (external shop, etc.)
 *  - 'invalid'      : present but not a valid URL
 *  - 'missing'      : null or empty
 */
function classifyUrl(productUrl) {
  if (!productUrl || !productUrl.trim()) return 'missing';
  const url = productUrl.trim();
  if (!isValidUrl(url)) return 'invalid';
  if (!isAmazonUrl(url)) return 'non-amazon';
  return 'ok'; // Amazon URL — tag can always be set/replaced
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  KITWER26 AFFILIATE AUDIT — tag: ' + AFFILIATE_TAG);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  const results = {
    ok:         [],  // Amazon URL, affiliate-compatible
    nonAmazon:  [],  // valid URL but not Amazon
    invalid:    [],  // present but malformed
    missing:    [],  // null or empty
  };

  let offset  = 0;
  let fetched = 0;

  // Paginated fetch of all products with price > 0
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, product_url')
      .gt('price', 0)
      .range(offset, offset + PAGE_SIZE - 1)
      .order('id');

    if (error) {
      console.error('[affiliate-audit] Supabase error:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      const classification = classifyUrl(row.product_url);
      const entry = { id: row.id, name: row.name, price: row.price, url: row.product_url };

      switch (classification) {
        case 'ok':         results.ok.push(entry);        break;
        case 'non-amazon': results.nonAmazon.push(entry); break;
        case 'invalid':    results.invalid.push(entry);   break;
        case 'missing':    results.missing.push(entry);   break;
      }
    }

    fetched += data.length;
    offset  += PAGE_SIZE;
    if (data.length < PAGE_SIZE) break;
  }

  const total        = fetched;
  const totalOk      = results.ok.length;
  const totalNonAmz  = results.nonAmazon.length;
  const totalInvalid = results.invalid.length;
  const totalMissing = results.missing.length;

  // ── Report ────────────────────────────────────────────────────────────────

  console.log(`Prodotti con price > 0 analizzati: ${total}`);
  console.log('');
  console.log(`  OK (Amazon, affiliate-compatible) : ${totalOk}`);
  console.log(`  Non-Amazon (URL valido, no tag)   : ${totalNonAmz}`);
  console.log(`  INVALID (URL malformato)           : ${totalInvalid}`);
  console.log(`  MISSING (product_url assente)      : ${totalMissing}`);
  console.log('');

  if (totalNonAmz > 0) {
    console.log('── Non-Amazon URLs (primi 20) ──────────────────────────');
    results.nonAmazon.slice(0, 20).forEach(r =>
      console.log(`  [${r.id}] ${r.name?.slice(0, 50)} → ${r.url?.slice(0, 80)}`),
    );
    console.log('');
  }

  if (totalInvalid > 0) {
    console.log('── INVALID URLs ────────────────────────────────────────');
    results.invalid.forEach(r =>
      console.log(`  [${r.id}] ${r.name?.slice(0, 50)} → ${String(r.url).slice(0, 80)}`),
    );
    console.log('');
  }

  if (totalMissing > 0) {
    console.log('── MISSING product_url (primi 50) ──────────────────────');
    results.missing.slice(0, 50).forEach(r =>
      console.log(`  [${r.id}] ${r.name?.slice(0, 60)}`),
    );
    if (totalMissing > 50) console.log(`  ... e altri ${totalMissing - 50} prodotti`);
    console.log('');
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  const actionRequired = totalMissing + totalInvalid;
  console.log('═══════════════════════════════════════════════════════');
  if (actionRequired === 0 && totalNonAmz === 0) {
    console.log('  RISULTATO: TUTTO OK — 100% affiliate-ready');
  } else {
    console.log(`  RISULTATO: ${totalOk} prodotti OK, ${actionRequired} richiedono azione`);
    if (totalMissing > 0)  console.log(`    → ${totalMissing} prodotti senza product_url (nessun link affiliato)`);
    if (totalInvalid > 0)  console.log(`    → ${totalInvalid} prodotti con URL malformato`);
    if (totalNonAmz > 0)   console.log(`    → ${totalNonAmz} prodotti con URL non-Amazon (nessun tag aggiunto)`);
  }
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Exit code: 0 if no critical issues (missing/invalid), 1 if action needed
  process.exit(actionRequired > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[affiliate-audit] ERRORE non gestito:', err);
  process.exit(1);
});
