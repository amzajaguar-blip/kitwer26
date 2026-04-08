#!/usr/bin/env tsx
/**
 * recovery-purge.ts — RECOVERY MODE v1.0
 *
 * Operazioni:
 *  1. Hard delete 6 prodotti specifici
 *  2. Deduplica EcoFlow Delta 1300 (mantieni migliore)
 *  3. Elimina prodotti senza immagine (NULL / '' / placeholder)
 *  4. Ricalcola TUTTI i prezzi: rimuove flat fee 3.99, formula = base*1.20 arrotondato
 *  5. Report affiliate_url: segnala link senza tag=kitwer26-21
 *
 * Run:
 *   npx tsx scripts/recovery-purge.ts            # dry-run (default)
 *   npx tsx scripts/recovery-purge.ts --write    # esegui modifiche
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Env ───────────────────────────────────────────────────────────────────────
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
  } catch { /* usa variabili di sistema */ }
}
loadEnv();

// ── Config ────────────────────────────────────────────────────────────────────
const WRITE_MODE = process.argv.includes('--write');
const DRY_RUN    = !WRITE_MODE;

const C = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  gray:    '\x1b[90m',
  magenta: '\x1b[35m',
  orange:  '\x1b[33m',
};
const ts  = () => new Date().toLocaleTimeString('it-IT');
const log = (color: string, tag: string, msg: string) =>
  console.log(`${C.gray}${ts()}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(`${C.red}${C.bright}[FATAL]${C.reset} NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local`);
    process.exit(1);
  }
  return createClient(url, key);
}

// ── Pricing ───────────────────────────────────────────────────────────────────
// Logica commercialRound identica a lib/utils/price.ts
function commercialRound(value: number): number {
  const floor = Math.floor(value);
  if (floor + 0.90 >= value) return floor + 0.90;
  if (floor + 0.99 >= value) return floor + 0.99;
  return (floor + 1) + 0.90;
}

// Ricalcola prezzo rimuovendo la flat fee 3.99 dai prezzi correnti.
// Vecchia formula: commercialRound(base * 1.20 + 3.99)
// Nuova formula:  commercialRound(base * 1.20)
// Approssimazione: base * 1.20 ≈ currentPrice - 3.99
function recalculatePrice(currentPrice: number): number {
  if (!currentPrice || currentPrice <= 0) return currentPrice;
  const estimatedBase120 = currentPrice - 3.99; // rimuovi flat fee
  if (estimatedBase120 <= 0) return currentPrice; // sicurezza: non abbassare sotto zero
  return commercialRound(estimatedBase120);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
interface Stats {
  hardDeleted:         number;
  hardDeletedNames:    string[];
  dedupDeleted:        number;
  noImageDeleted:      number;
  pricesRecalculated:  number;
  affiliateMissing:    { id: string; name: string; url: string | null }[];
}

// ── Step 1: Hard delete prodotti specifici ────────────────────────────────────
const HARD_DELETE_PATTERNS = [
  'Peak Design USB-C Kevlar',
  'ESR 120W GaN',
  'Goal Zero Nomad 50',
  'Nillkin 65W GaN',
  'Jackery Explorer 240',
  'Supporto Solare Regolabile',
];

async function step1_hardDelete(sb: SupabaseClient, stats: Stats) {
  log(C.cyan, 'STEP-1', 'Hard delete prodotti specifici...');

  for (const pattern of HARD_DELETE_PATTERNS) {
    const { data, error } = await sb
      .from('products')
      .select('id, name')
      .ilike('name', `%${pattern}%`);

    if (error) { log(C.red, 'ERR', `Query fallita per "${pattern}": ${error.message}`); continue; }
    if (!data || data.length === 0) {
      log(C.gray, 'SKIP', `"${pattern}" — non trovato nel DB`);
      continue;
    }

    for (const p of data) {
      log(C.yellow, 'DEL', `  → [${p.id}] ${p.name}`);
      stats.hardDeletedNames.push(p.name);
    }

    if (!DRY_RUN) {
      const ids = data.map((p: { id: string }) => p.id);
      const { error: delErr } = await sb.from('products').delete().in('id', ids);
      if (delErr) log(C.red, 'ERR', `Delete fallito per "${pattern}": ${delErr.message}`);
      else stats.hardDeleted += ids.length;
    } else {
      stats.hardDeleted += data.length;
    }
  }
}

// ── Step 2: Deduplica EcoFlow Delta 1300 ──────────────────────────────────────
async function step2_dedupEcoFlow(sb: SupabaseClient, stats: Stats) {
  log(C.cyan, 'STEP-2', 'Deduplicazione EcoFlow Delta 1300...');

  const { data, error } = await sb
    .from('products')
    .select('id, name, price, image_url, affiliate_url, created_at')
    .ilike('name', '%EcoFlow Delta 1300%')
    .order('price', { ascending: false });

  if (error) { log(C.red, 'ERR', error.message); return; }
  if (!data || data.length <= 1) {
    log(C.green, 'OK', `EcoFlow Delta 1300 — ${data?.length ?? 0} record, nessun duplicato`);
    return;
  }

  // Tieni il migliore: ha image_url + prezzo più alto (già ordinato desc)
  const best = data.find((p: { image_url: string | null }) => p.image_url && !p.image_url.includes('placeholder')) ?? data[0];
  const toDelete = data.filter((p: { id: string }) => p.id !== best.id);

  log(C.green, 'KEEP', `  ✓ [${best.id}] ${best.name} | €${best.price} | img: ${best.image_url ? 'OK' : 'MISSING'}`);
  for (const p of toDelete) {
    log(C.yellow, 'DEL', `  → [${p.id}] ${p.name} | €${p.price} | img: ${p.image_url ? 'OK' : 'MISSING'}`);
  }

  if (!DRY_RUN) {
    const ids = toDelete.map((p: { id: string }) => p.id);
    const { error: delErr } = await sb.from('products').delete().in('id', ids);
    if (delErr) log(C.red, 'ERR', delErr.message);
    else stats.dedupDeleted += ids.length;
  } else {
    stats.dedupDeleted += toDelete.length;
  }
}

// ── Step 3: Elimina prodotti senza immagine ───────────────────────────────────
async function step3_noImage(sb: SupabaseClient, stats: Stats) {
  log(C.cyan, 'STEP-3', 'Eliminazione prodotti senza immagine...');

  // Escludi prodotti Bundle/Kit — sono prodotti virtuali senza immagine per design
  const { data, error } = await sb
    .from('products')
    .select('id, name, image_url')
    .or('image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%')
    .not('name', 'ilike', '%Bundle%')
    .not('name', 'ilike', '%Kit%')
    .not('name', 'ilike', '%Kitwer26%');

  if (error) { log(C.red, 'ERR', error.message); return; }
  if (!data || data.length === 0) {
    log(C.green, 'OK', 'Nessun prodotto senza immagine trovato');
    return;
  }

  log(C.yellow, 'WARN', `Trovati ${data.length} prodotti senza immagine valida:`);
  for (const p of data) {
    log(C.gray, 'DEL', `  → [${p.id}] ${p.name} | image_url: ${JSON.stringify(p.image_url)}`);
  }

  if (!DRY_RUN) {
    const ids = data.map((p: { id: string }) => p.id);
    const { error: delErr } = await sb.from('products').delete().in('id', ids);
    if (delErr) log(C.red, 'ERR', delErr.message);
    else stats.noImageDeleted += ids.length;
  } else {
    stats.noImageDeleted += data.length;
  }
}

// ── Step 4: Ricalcola prezzi (rimuovi flat fee 3.99) ─────────────────────────
async function step4_recalculatePrices(sb: SupabaseClient, stats: Stats) {
  log(C.cyan, 'STEP-4', 'Ricalcolo prezzi — rimozione flat fee 3.99...');

  const { data, error } = await sb
    .from('products')
    .select('id, name, price')
    .gt('price', 0);

  if (error) { log(C.red, 'ERR', error.message); return; }
  if (!data || data.length === 0) { log(C.green, 'OK', 'Nessun prodotto con prezzo > 0'); return; }

  log(C.cyan, 'INFO', `Prodotti da ricalcolare: ${data.length}`);

  const updates: { id: string; name: string; oldPrice: number; newPrice: number }[] = [];

  for (const p of data) {
    const newPrice = recalculatePrice(p.price);
    if (Math.abs(newPrice - p.price) > 0.001) {
      updates.push({ id: p.id, name: p.name, oldPrice: p.price, newPrice });
    }
  }

  log(C.yellow, 'CHANGES', `Prezzi che cambiano: ${updates.length} / ${data.length}`);

  // Mostra campione dei cambiamenti
  const sample = updates.slice(0, 10);
  for (const u of sample) {
    log(C.gray, 'PRICE', `  [${String(u.id).padStart(6)}] ${u.name.slice(0,40).padEnd(40)} | €${u.oldPrice.toFixed(2)} → €${u.newPrice.toFixed(2)}`);
  }
  if (updates.length > 10) {
    log(C.gray, 'PRICE', `  ... e altri ${updates.length - 10} prodotti`);
  }

  if (!DRY_RUN) {
    let successCount = 0;
    // Batch updates in gruppi di 50 per evitare timeout
    const BATCH = 50;
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH);
      await Promise.all(batch.map(async (u) => {
        const { error: upErr } = await sb
          .from('products')
          .update({ price: u.newPrice })
          .eq('id', u.id);
        if (upErr) log(C.red, 'ERR', `Update fallito [${u.id}]: ${upErr.message}`);
        else successCount++;
      }));
      log(C.gray, 'BATCH', `  Aggiornati ${Math.min(i + BATCH, updates.length)} / ${updates.length}...`);
    }
    stats.pricesRecalculated = successCount;
    log(C.green, 'DONE', `${successCount} prezzi aggiornati nel DB`);
  } else {
    stats.pricesRecalculated = updates.length;
  }
}

// ── Step 5: Report affiliate URL ──────────────────────────────────────────────
async function step5_affiliateReport(sb: SupabaseClient, stats: Stats) {
  log(C.cyan, 'STEP-5', 'Verifica affiliate URL (tag=kitwer26-21)...');

  const { data, error } = await sb
    .from('products')
    .select('id, name, affiliate_url')
    .gt('price', 0); // solo prodotti visibili

  if (error) { log(C.red, 'ERR', error.message); return; }
  if (!data) return;

  const missing = data.filter((p: { affiliate_url: string | null }) =>
    !p.affiliate_url || !p.affiliate_url.includes('tag=kitwer26-21')
  );

  stats.affiliateMissing = missing.map((p: { id: string; name: string; affiliate_url: string | null }) => ({
    id: p.id,
    name: p.name,
    url: p.affiliate_url ?? null,
  }));

  if (missing.length === 0) {
    log(C.green, 'OK', `Tutti i ${data.length} prodotti visibili hanno il tag affiliate corretto`);
  } else {
    log(C.red, 'CRITICO', `${missing.length} prodotti SENZA tag=kitwer26-21:`);
    for (const p of missing.slice(0, 20)) {
      log(C.red, 'ERR-AFF', `  → [${p.id}] ${p.name} | url: ${p.affiliate_url ?? 'NULL'}`);
    }
    if (missing.length > 20) {
      log(C.red, 'ERR-AFF', `  ... e altri ${missing.length - 20} prodotti`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log(`${C.bright}${C.red}════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bright}  KITWER26 — RECOVERY PURGE v1.0${C.reset}`);
  console.log(`${C.bright}  Modalità: ${DRY_RUN ? `${C.yellow}DRY-RUN${C.reset}` : `${C.red}WRITE ⚠️${C.reset}`}`);
  console.log(`${C.bright}${C.red}════════════════════════════════════════════════════${C.reset}`);
  console.log('');

  const sb = getSupabase();

  const stats: Stats = {
    hardDeleted:         0,
    hardDeletedNames:    [],
    dedupDeleted:        0,
    noImageDeleted:      0,
    pricesRecalculated:  0,
    affiliateMissing:    [],
  };

  await step1_hardDelete(sb, stats);
  console.log('');
  await step2_dedupEcoFlow(sb, stats);
  console.log('');
  await step3_noImage(sb, stats);
  console.log('');
  await step4_recalculatePrices(sb, stats);
  console.log('');
  await step5_affiliateReport(sb, stats);
  console.log('');

  // ── Final Report ────────────────────────────────────────────────────────────
  console.log(`${C.bright}${C.cyan}════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bright}  RESOCONTO FINALE${DRY_RUN ? ' (DRY-RUN — nessuna modifica applicata)' : ''}${C.reset}`);
  console.log(`${C.bright}${C.cyan}════════════════════════════════════════════════════${C.reset}`);
  console.log('');
  console.log(`  ADMIN:      ${stats.hardDeleted === 0 && stats.dedupDeleted === 0 ? '✅' : '🗑️ '} ${stats.hardDeleted} prodotti eliminati (specifici)`);
  console.log(`  DEDUP:      ${stats.dedupDeleted === 0 ? '✅' : '🗑️ '} ${stats.dedupDeleted} duplicati rimossi (EcoFlow)`);
  console.log(`  NO-IMAGE:   ${stats.noImageDeleted === 0 ? '✅' : '🗑️ '} ${stats.noImageDeleted} prodotti senza immagine rimossi`);
  console.log(`  PRICES:     🔄  ${stats.pricesRecalculated} prezzi ${DRY_RUN ? 'da aggiornare' : 'aggiornati'} (flat fee 3.99 rimossa)`);
  console.log(`  AFFILIATE:  ${stats.affiliateMissing.length === 0 ? '✅' : '❌ ERRORE CRITICO'} ${stats.affiliateMissing.length} link senza tag=kitwer26-21`);
  console.log('');

  if (stats.hardDeletedNames.length > 0) {
    console.log(`  Prodotti eliminati:`);
    for (const n of stats.hardDeletedNames) console.log(`    - ${n}`);
    console.log('');
  }

  if (stats.affiliateMissing.length > 0) {
    console.log(`  ${C.bright}${C.red}⚠️  ERRORE CRITICO — Affiliate URL mancanti o senza tag:${C.reset}`);
    for (const p of stats.affiliateMissing.slice(0, 10)) {
      console.log(`    - [${p.id}] ${p.name}`);
    }
    if (stats.affiliateMissing.length > 10) {
      console.log(`    ... e altri ${stats.affiliateMissing.length - 10}`);
    }
    console.log('');
  }

  if (DRY_RUN) {
    console.log(`${C.bright}${C.yellow}  ➡️  Per applicare: npx tsx scripts/recovery-purge.ts --write${C.reset}`);
    console.log('');
    const totalChanges = stats.hardDeleted + stats.dedupDeleted + stats.noImageDeleted + stats.pricesRecalculated;
    console.log(`  FINAL STATUS: ${totalChanges > 0 ? 'CHANGES PENDING ⏳' : 'NOTHING TO DO ✅'}`);
  } else {
    const issues = stats.affiliateMissing.length;
    console.log(`  FINAL STATUS: ${issues === 0 ? 'READY ✅' : `NOT READY ❌ (${issues} affiliate URL critici)`}`);
  }
  console.log('');
}

main().catch(err => {
  console.error(`${C.red}${C.bright}[FATAL]${C.reset}`, err);
  process.exit(1);
});
