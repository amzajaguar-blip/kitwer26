#!/usr/bin/env tsx
/**
 * Migra i prodotti con categoria 'Smart Home' che hanno galleria completa
 * verso 'sicurezza-domotica-high-end' (Smart Home Pro).
 *
 * Uso:
 *   npx tsx scripts/migrate-smarthome.ts           → dry-run
 *   npx tsx scripts/migrate-smarthome.ts --execute  → esegue davvero
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Colori ────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', gray: '\x1b[90m',
};
const log = (color: string, tag: string, msg: string) => {
  const ts = new Date().toLocaleTimeString('it-IT');
  console.log(`${C.gray}${ts}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);
};

// ── ENV ───────────────────────────────────────────────────────────
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error(`${C.red}${C.bright}[FATAL]${C.reset} NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local`);
  process.exit(1);
}
const supabase = createClient(url, key);

// ── Logica "galleria completa" ────────────────────────────────────
// Condizioni: image_url presente E image_urls è un array con almeno 2 elementi
function hasCompleteGallery(p: { image_url: string | null; image_urls: string[] | null }): boolean {
  const hasMain  = !!p.image_url?.trim();
  const hasExtra = Array.isArray(p.image_urls) && p.image_urls.filter(u => u?.trim()).length >= 2;
  return hasMain && hasExtra;
}

// ── Main ──────────────────────────────────────────────────────────
const dryRun = !process.argv.includes('--execute');

(async () => {
  console.log();
  console.log(`${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  MIGRAZIONE Smart Home → Smart Home Pro${C.reset}`);
  if (dryRun) console.log(`${C.yellow}${C.bright}  [DRY-RUN] Nessuna modifica verrà salvata${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}`);
  console.log();

  // 1. Prendi tutti i prodotti Smart Home
  log(C.cyan, 'FETCH', "Recupero prodotti categoria 'Smart Home'...");
  const { data, error } = await supabase
    .from('products')
    .select('id, name, image_url, image_urls')
    .eq('category', 'Smart Home');

  if (error) {
    log(C.red, 'ERROR', error.message);
    process.exit(1);
  }

  const all = data ?? [];
  log(C.cyan, 'FETCH', `Trovati ${all.length} prodotti in 'Smart Home'`);

  // 2. Separa con/senza galleria completa
  const toMigrate = all.filter(hasCompleteGallery);
  const toSkip    = all.filter(p => !hasCompleteGallery(p));

  console.log();
  log(C.green,  'CON GALLERIA', `${toMigrate.length} prodotti → verranno spostati in Smart Home Pro`);
  log(C.yellow, 'SENZA GALLERIA', `${toSkip.length} prodotti → restano esclusi (da completare)`);
  console.log();

  if (toMigrate.length > 0) {
    console.log(`${C.bright}Prodotti da migrare:${C.reset}`);
    for (const p of toMigrate) {
      const urls = Array.isArray(p.image_urls) ? p.image_urls.filter(u => u?.trim()).length : 0;
      console.log(`  ${C.green}✓${C.reset} [${p.id}] ${p.name} (${urls} immagini extra)`);
    }
    console.log();
  }

  if (toSkip.length > 0) {
    console.log(`${C.bright}Prodotti esclusi (senza galleria completa):${C.reset}`);
    for (const p of toSkip) {
      const hasMain  = !!p.image_url?.trim();
      const urlCount = Array.isArray(p.image_urls) ? p.image_urls.filter(u => u?.trim()).length : 0;
      console.log(`  ${C.yellow}✗${C.reset} [${p.id}] ${p.name} (main: ${hasMain ? 'sì' : 'NO'}, extra: ${urlCount})`);
    }
    console.log();
  }

  if (toMigrate.length === 0) {
    log(C.yellow, 'INFO', 'Nessun prodotto con galleria completa trovato. Nulla da fare.');
    return;
  }

  if (dryRun) {
    console.log(`${C.yellow}${C.bright}[DRY-RUN] Per eseguire la migrazione:${C.reset}`);
    console.log(`  npx tsx scripts/migrate-smarthome.ts --execute`);
    console.log();
    return;
  }

  // 3. Aggiorna categoria
  log(C.cyan, 'UPDATE', `Aggiornamento di ${toMigrate.length} prodotti...`);
  const ids = toMigrate.map(p => p.id);

  const { error: updateError } = await supabase
    .from('products')
    .update({ category: 'sicurezza-domotica-high-end' })
    .in('id', ids);

  if (updateError) {
    log(C.red, 'ERROR', updateError.message);
    process.exit(1);
  }

  log(C.green, 'DONE', `${toMigrate.length} prodotti spostati in 'sicurezza-domotica-high-end' (Smart Home Pro)`);
  console.log();
})();
