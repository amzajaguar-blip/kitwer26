/**
 * LINK CHECKER
 *
 * Verifica l'integrità di tutti gli affiliate_url nella tabella products.
 * - HEAD request per ogni link (fallback GET se HEAD non supportato)
 * - Segna active=false su Supabase per i link morti
 * - Scrive link_da_sostituire.txt con i prodotti da correggere
 * - Report finale: X attivi, Y morti
 *
 * Run:  npx tsx scripts/link-checker.ts
 *
 * Richiede in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← chiave admin (Settings → API)
 */

import { createClient } from '@supabase/supabase-js';
import { appendFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ──────────────────────────────────────────────
// COLORI TERMINALE
// ──────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  cyan:    '\x1b[36m',
};

// ──────────────────────────────────────────────
// ENV
// ──────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;
  const lines = require('fs').readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`${C.red}[ERRORE] Variabili d'ambiente mancanti.${C.reset}`);
  console.error('Assicurati di avere in .env.local:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ──────────────────────────────────────────────
// COSTANTI
// ──────────────────────────────────────────────
const TIMEOUT_MS       = 10_000;   // timeout per ogni richiesta HTTP
const CONCURRENCY      = 5;        // richieste parallele contemporanee
const OUTPUT_FILE      = resolve(process.cwd(), 'link_da_sostituire.txt');
const TODAY            = new Date().toISOString().split('T')[0];

// ──────────────────────────────────────────────
// TIPI
// ──────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  affiliate_url: string | null;
  active: boolean | null;
}

interface CheckResult {
  product: Product;
  status: number | null;   // null = errore di connessione
  ok: boolean;
  error?: string;
}

// ──────────────────────────────────────────────
// HTTP CHECK
// ──────────────────────────────────────────────
async function checkUrl(url: string): Promise<{ status: number | null; ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Prova prima HEAD
    let res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)' },
    });

    // Alcuni server rifiutano HEAD con 405 → riprova con GET
    if (res.status === 405 || res.status === 501) {
      clearTimeout(timer);
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
      try {
        res = await fetch(url, {
          method: 'GET',
          signal: controller2.signal,
          redirect: 'follow',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkChecker/1.0)' },
        });
      } finally {
        clearTimeout(timer2);
      }
    }

    return { status: res.status, ok: res.ok };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: null, ok: false, error: msg.includes('abort') ? 'Timeout' : msg };
  } finally {
    clearTimeout(timer);
  }
}

// ──────────────────────────────────────────────
// CONCURRENCY POOL
// ──────────────────────────────────────────────
async function checkAll(products: Product[]): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  const queue = [...products];

  async function worker() {
    while (queue.length > 0) {
      const product = queue.shift()!;
      const url = product.affiliate_url;

      if (!url) {
        results.push({ product, status: null, ok: false, error: 'URL vuoto' });
        continue;
      }

      const { status, ok, error } = await checkUrl(url);
      results.push({ product, status, ok, error });

      const label = ok
        ? `${C.green}[OK ${status}]${C.reset}`
        : `${C.red}[DEAD ${status ?? error}]${C.reset}`;
      console.log(`  ${label} ${product.name}`);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, worker);
  await Promise.all(workers);
  return results;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bright}${C.cyan}╔══════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bright}${C.cyan}║         LINK CHECKER - Kitwer26       ║${C.reset}`);
  console.log(`${C.bright}${C.cyan}╚══════════════════════════════════════╝${C.reset}\n`);
  console.log(`${C.yellow}Data:${C.reset} ${TODAY}`);

  // 1. Recupera prodotti
  console.log(`\n${C.cyan}▶ Recupero prodotti da Supabase...${C.reset}`);
  const { data, error } = await supabase
    .from('products')
    .select('id, name, affiliate_url, active')
    .not('affiliate_url', 'is', null);

  if (error) {
    console.error(`${C.red}[ERRORE Supabase]${C.reset}`, error.message);
    process.exit(1);
  }

  const products = (data ?? []) as Product[];
  console.log(`  Trovati ${products.length} prodotti con affiliate_url.\n`);

  if (products.length === 0) {
    console.log('Nessun prodotto da controllare. Uscita.');
    return;
  }

  // 2. Controlla i link
  console.log(`${C.cyan}▶ Verifica link in corso (concorrenza: ${CONCURRENCY})...${C.reset}\n`);
  const results = await checkAll(products);

  // 3. Analizza risultati
  const dead = results.filter(r => !r.ok);
  const alive = results.filter(r => r.ok);

  // 4. Gestione link morti
  if (dead.length > 0) {
    console.log(`\n${C.red}${C.bright}▶ Link non funzionanti rilevati: ${dead.length}${C.reset}`);

    // Aggiorna active=false su Supabase
    const deadIds = dead.map(r => r.product.id);
    const { error: updateError } = await supabase
      .from('products')
      .update({ active: false })
      .in('id', deadIds);

    if (updateError) {
      console.error(`${C.red}[ERRORE] Aggiornamento active=false fallito:${C.reset}`, updateError.message);
    } else {
      console.log(`  ${C.green}✓ active=false impostato per ${deadIds.length} prodotti.${C.reset}`);
    }

    // Scrivi/aggiorna file link_da_sostituire.txt
    const lines = dead.map(r => {
      const status = r.status ?? r.error ?? 'ERRORE';
      return `[${TODAY}] ${r.product.name} | Status: ${status} | URL: ${r.product.affiliate_url ?? 'N/A'}`;
    });

    // Aggiunge sempre in append (non sovrascrive storico precedente)
    appendFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf-8');
    console.log(`  ${C.yellow}✓ Scritto in: link_da_sostituire.txt${C.reset}`);

    // Log ALERT per ogni link morto
    console.log();
    for (const r of dead) {
      console.log(`${C.red}[ALERT] Link non funzionante trovato: ${r.product.name}${C.reset}`);
    }
  } else {
    console.log(`\n${C.green}▶ Tutti i link sono attivi!${C.reset}`);
  }

  // 5. Riattiva prodotti precedentemente morti che ora funzionano
  const recovered = alive.filter(r => r.product.active === false);
  if (recovered.length > 0) {
    const recoveredIds = recovered.map(r => r.product.id);
    const { error: reactivateError } = await supabase
      .from('products')
      .update({ active: true })
      .in('id', recoveredIds);

    if (!reactivateError) {
      console.log(`\n${C.green}▶ Ripristinati ${recoveredIds.length} prodotti (erano inactive, ora OK).${C.reset}`);
    }
  }

  // 6. Report finale
  console.log(`\n${C.bright}${C.cyan}══════════════════════════════════════${C.reset}`);
  console.log(`${C.bright}Controllo terminato. ${C.green}${alive.length} link attivi${C.reset}${C.bright}, ${C.red}${dead.length} link morti${C.reset}${C.bright} rilevati.${C.reset}`);
  console.log(`${C.cyan}══════════════════════════════════════${C.reset}\n`);
}

main().catch(err => {
  console.error(`${C.red}[ERRORE CRITICO]${C.reset}`, err);
  process.exit(1);
});
