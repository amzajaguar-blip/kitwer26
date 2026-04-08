#!/usr/bin/env tsx
/**
 * fix-affiliate-urls.ts
 *
 * Recupera affiliate_url da product_url:
 *  - Se product_url = 'INSERIRE_LINK_AMAZON_IT' o vuoto → imposta price=0 (nascondi)
 *  - Se product_url è Amazon URL senza tag → aggiungi tag, copia in affiliate_url
 *  - Se product_url è Amazon URL con tag → copia direttamente in affiliate_url
 *  - Se affiliate_url già presente e valido → skip
 *
 * Run:
 *   npx tsx scripts/fix-affiliate-urls.ts           # dry-run
 *   npx tsx scripts/fix-affiliate-urls.ts --write   # applica
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
  } catch { /* usa env sistema */ }
}
loadEnv();

const WRITE = process.argv.includes('--write');
const TAG   = 'tag=kitwer26-21';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', gray: '\x1b[90m',
};
const log = (c: string, t: string, m: string) =>
  console.log(`${C.gray}${new Date().toLocaleTimeString('it-IT')}${C.reset} ${c}${C.bright}[${t}]${C.reset} ${m}`);

function addTag(url: string): string {
  if (url.includes(TAG)) return url;
  // Pulisci URL: rimuovi trailing slash
  const clean = url.replace(/\/$/, '');
  const sep   = clean.includes('?') ? '&' : '?';
  return `${clean}${sep}${TAG}`;
}

function isAmazonUrl(url: string): boolean {
  return url.startsWith('https://www.amazon.') || url.startsWith('http://www.amazon.');
}

function isPlaceholder(url: string | null): boolean {
  if (!url || url.trim() === '') return true;
  const u = url.trim().toUpperCase();
  return (
    u === 'INSERIRE_LINK_AMAZON_IT' ||
    u.includes('INSERIRE') ||
    u.includes('PLACEHOLDER') ||
    u.includes('NO-IMAGE') ||
    u.includes('TEST') ||
    u === 'NULL'
  );
}

async function main() {
  console.log('');
  console.log(`${C.bright}${C.cyan}══════════════════════════════════════${C.reset}`);
  console.log(`${C.bright}  FIX AFFILIATE URLs — ${WRITE ? `${C.red}WRITE` : `${C.yellow}DRY-RUN`}${C.reset}`);
  console.log(`${C.bright}${C.cyan}══════════════════════════════════════${C.reset}`);
  console.log('');

  // Fetch all products in batches (Supabase default limit 1000)
  const PAGE = 1000;
  let offset = 0;
  let allProducts: { id: number; name: string; price: number; product_url: string | null; affiliate_url: string | null }[] = [];

  while (true) {
    const { data, error } = await sb
      .from('products')
      .select('id, name, price, product_url, affiliate_url')
      .range(offset, offset + PAGE - 1);
    if (error) { log(C.red, 'ERR', error.message); break; }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  log(C.cyan, 'INFO', `Prodotti totali nel DB: ${allProducts.length}`);

  const toHide:       { id: number; name: string }[] = [];
  const toFixWithTag: { id: number; name: string; newUrl: string }[] = [];
  const alreadyOk:    number[] = [];
  const skipped:      number[] = [];

  for (const p of allProducts) {
    // Già ha affiliate_url valido con tag?
    if (p.affiliate_url && p.affiliate_url.includes(TAG)) {
      alreadyOk.push(p.id);
      continue;
    }

    // product_url è placeholder?
    if (isPlaceholder(p.product_url)) {
      if (p.price > 0) toHide.push({ id: p.id, name: p.name });
      continue;
    }

    // product_url è Amazon URL?
    if (p.product_url && isAmazonUrl(p.product_url)) {
      toFixWithTag.push({ id: p.id, name: p.name, newUrl: addTag(p.product_url) });
      continue;
    }

    skipped.push(p.id);
  }

  log(C.green, 'OK',     `Già corretti (affiliate_url con tag): ${alreadyOk.length}`);
  log(C.yellow, 'FIX',   `URL Amazon da taggare → affiliate_url: ${toFixWithTag.length}`);
  log(C.red, 'HIDE',     `Placeholder → price=0 (nascondi): ${toHide.length}`);
  log(C.gray, 'SKIP',    `Nessun URL recuperabile: ${skipped.length}`);

  if (toFixWithTag.length > 0) {
    log(C.cyan, 'SAMPLE', 'Primi 5 URL da recuperare:');
    for (const p of toFixWithTag.slice(0, 5)) {
      log(C.gray, 'URL', `  [${p.id}] ${p.name.slice(0,40)} → ${p.newUrl.slice(0,70)}`);
    }
  }

  if (toHide.length > 0) {
    log(C.red, 'SAMPLE', 'Prodotti da nascondere (placeholder URL):');
    for (const p of toHide.slice(0, 10)) {
      log(C.gray, 'HIDE', `  [${p.id}] ${p.name}`);
    }
    if (toHide.length > 10) log(C.gray, 'HIDE', `  ... e altri ${toHide.length - 10}`);
  }

  if (WRITE) {
    // Batch update affiliate_url
    if (toFixWithTag.length > 0) {
      log(C.cyan, 'WRITE', `Aggiorno ${toFixWithTag.length} affiliate_url...`);
      const BATCH = 50;
      let done = 0;
      for (let i = 0; i < toFixWithTag.length; i += BATCH) {
        const batch = toFixWithTag.slice(i, i + BATCH);
        await Promise.all(batch.map(async (p) => {
          const { error } = await sb.from('products').update({ affiliate_url: p.newUrl }).eq('id', p.id);
          if (error) log(C.red, 'ERR', `[${p.id}] ${error.message}`);
          else done++;
        }));
        if ((i + BATCH) % 200 === 0) log(C.gray, 'PROG', `  ${Math.min(i + BATCH, toFixWithTag.length)} / ${toFixWithTag.length}`);
      }
      log(C.green, 'DONE', `${done} affiliate_url aggiornati ✅`);
    }

    // Nascondi prodotti con placeholder URL
    if (toHide.length > 0) {
      log(C.yellow, 'WRITE', `Nascondo ${toHide.length} prodotti con URL placeholder (price=0)...`);
      const ids = toHide.map(p => p.id);
      const BATCH = 100;
      let hidden = 0;
      for (let i = 0; i < ids.length; i += BATCH) {
        const { error } = await sb.from('products').update({ price: 0 }).in('id', ids.slice(i, i + BATCH));
        if (error) log(C.red, 'ERR', error.message);
        else hidden += Math.min(BATCH, ids.length - i);
      }
      log(C.yellow, 'DONE', `${hidden} prodotti nascosti dal frontend ✅`);
    }
  }

  console.log('');
  console.log(`${C.bright}${C.cyan}══════════════════════════════════════${C.reset}`);
  console.log(`${C.bright}  RESOCONTO${WRITE ? '' : ' (DRY-RUN)'}${C.reset}`);
  console.log(`${C.bright}${C.cyan}══════════════════════════════════════${C.reset}`);
  console.log(`  Già OK:          ${alreadyOk.length}`);
  console.log(`  URL recuperati:  ${toFixWithTag.length}${WRITE ? ' ✅' : ' (pending)'}`);
  console.log(`  Nascosti:        ${toHide.length}${WRITE ? ' ✅' : ' (pending)'}`);
  console.log(`  Irrecuperabili:  ${skipped.length}`);
  console.log('');

  const coverage = Math.round((alreadyOk.length + toFixWithTag.length) / allProducts.length * 100);
  console.log(`  Copertura affiliate dopo fix: ~${coverage}%`);
  if (!WRITE) console.log(`\n  ${C.bright}${C.yellow}➡️  Lancia con --write per applicare${C.reset}`);
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
