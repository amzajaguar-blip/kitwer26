/**
 * populate-variants.ts
 * Popola la colonna variants (JSONB) su tutti i prodotti esistenti.
 *
 * Run:
 *   npx tsx scripts/populate-variants.ts            ← solo prodotti senza variants
 *   npx tsx scripts/populate-variants.ts --all      ← tutti (sovrascrive)
 *   npx tsx scripts/populate-variants.ts --dry-run  ← stampa senza salvare
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── ENV ───────────────────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (k) process.env[k] = v;
    }
  } catch { /* usa variabili di sistema */ }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
);

// ── COLORI TERMINALE ──────────────────────────────────────────────────────────
const C = { reset:'\x1b[0m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', gray:'\x1b[90m', bright:'\x1b[1m' };
function log(color: string, tag: string, msg: string) {
  console.log(`${C.gray}${new Date().toLocaleTimeString('it-IT')}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);
}

// ── USER-AGENTS ───────────────────────────────────────────────────────────────
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];
let uaIdx = 0;
const nextUA = () => UAS[uaIdx++ % UAS.length];

function delay(min = 4000, max = 7000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  log(C.yellow, 'PAUSA', `${(ms/1000).toFixed(1)}s anti-bot...`);
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── ASIN da URL ───────────────────────────────────────────────────────────────
function extractAsin(url: string): string | null {
  const m = url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i);
  return m ? m[1].toUpperCase() : null;
}

// ── TIPI ──────────────────────────────────────────────────────────────────────
interface Variant {
  name:    string;
  values:  string[];
  images?: Record<string, string>;
}

// ── SCRAPER VARIANTI + IMMAGINI ───────────────────────────────────────────────
async function scrapeVariants(asin: string): Promise<Variant[]> {
  try {
    const res = await fetch(`https://www.amazon.it/dp/${asin}/`, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) { log(C.yellow, 'HTTP', `${res.status} per ${asin}`); return []; }
    const html = await res.text();

    if (html.toLowerCase().includes('captcha') || html.includes('Type the characters')) {
      log(C.red, 'CAPTCHA', `Bloccato su ${asin} — salto`);
      return [];
    }

    // ── colorImages → mappa displayName/ASIN → hiRes URL ─────────────────────
    const colorImagesMap: Record<string, string> = {};
    const ciMatch = html.match(/"colorImages"\s*:\s*(\{[\s\S]+?\})\s*(?=,\s*"[a-z])/);
    if (ciMatch) {
      try {
        const ci = JSON.parse(ciMatch[1]) as Record<string, Array<{ hiRes?: string; large?: string }>>;
        for (const [k, imgs] of Object.entries(ci)) {
          if (k === 'initial') continue;
          const url = imgs?.[0]?.hiRes ?? imgs?.[0]?.large;
          if (url) colorImagesMap[k] = url;
        }
      } catch { /* no-op */ }
    }

    const matchImages = (values: string[]): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const val of values) {
        const key = Object.keys(colorImagesMap).find(
          (k) => k.toLowerCase() === val.toLowerCase() || k.toLowerCase().includes(val.toLowerCase())
        );
        if (key) out[val] = colorImagesMap[key];
      }
      return out;
    };

    // ── 1. dimensionValuesDisplayData ─────────────────────────────────────────
    const dvMatch = html.match(/"dimensionValuesDisplayData"\s*:\s*(\{[^}]+\})/);
    if (dvMatch) {
      try {
        const raw = JSON.parse(dvMatch[1]) as Record<string, string[]>;
        const variants: Variant[] = Object.entries(raw)
          .map(([name, vals]) => {
            const values = vals.map((v) => v.trim()).filter(Boolean);
            const images = matchImages(values);
            return { name, values, ...(Object.keys(images).length ? { images } : {}) };
          })
          .filter((v) => v.values.length > 0);
        if (variants.length) return variants;
      } catch { /* fallback */ }
    }

    // ── 2. Fallback DOM select ────────────────────────────────────────────────
    const variants: Variant[] = [];

    const colorOpts = [...html.matchAll(/<option[^>]*>([^<]{2,50})<\/option>/gi)]
      .map((m) => m[1].trim())
      .filter((v) => v && !['Seleziona', 'Select', '--'].includes(v));

    if (colorOpts.length) {
      const images = matchImages(colorOpts);
      variants.push({ name: 'Colore', values: colorOpts, ...(Object.keys(images).length ? { images } : {}) });
    }

    return variants;
  } catch (err) {
    log(C.red, 'ERR', String(err));
    return [];
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const allMode    = process.argv.includes('--all');
  const dryRun     = process.argv.includes('--dry-run');

  console.log(`\n${C.bright}${C.cyan}${'━'.repeat(54)}${C.reset}`);
  console.log(`${C.bright}${C.cyan}   POPULATE-VARIANTS — Scraper massivo${C.reset}`);
  console.log(`${C.bright}${C.cyan}   Modalità: ${allMode ? 'ALL (sovrascrive)' : 'SOLO vuoti'}${dryRun ? ' — DRY RUN' : ''}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'━'.repeat(54)}${C.reset}\n`);

  // Carica prodotti
  const query = supabase.from('products').select('id, name, affiliate_url, variants');
  const { data: products, error } = await query;
  if (error) { log(C.red, 'FATAL', error.message); process.exit(1); }
  if (!products?.length) { log(C.yellow, 'INFO', 'Nessun prodotto trovato'); return; }

  // Filtra
  const toProcess = allMode
    ? products.filter((p) => p.affiliate_url)
    : products.filter((p) => p.affiliate_url && (!p.variants || (p.variants as Variant[]).length === 0));

  log(C.cyan, 'SCAN', `${toProcess.length} prodotti da processare (totale: ${products.length})\n`);

  let done = 0, skipped = 0, withVariants = 0, withImages = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const asin = extractAsin(p.affiliate_url);
    console.log(`\n${C.bright}${C.yellow}── [${i+1}/${toProcess.length}] ${p.name.slice(0, 60)} ──${C.reset}`);

    if (!asin) {
      log(C.yellow, 'SKIP', 'ASIN non estraibile dal link');
      skipped++;
      continue;
    }

    const variants = await scrapeVariants(asin);

    if (!variants.length) {
      log(C.gray, 'NO-VAR', 'Nessuna variante trovata');
      skipped++;
    } else {
      const imgCount = variants.reduce((s, v) => s + Object.keys(v.images ?? {}).length, 0);
      log(C.green, 'OK', `${variants.map((v) => `${v.name}(${v.values.length})`).join(', ')} | ${imgCount} immagini variante`);
      withVariants++;
      if (imgCount > 0) withImages++;

      if (!dryRun) {
        const { error: upErr } = await supabase
          .from('products')
          .update({ variants })
          .eq('id', p.id);
        if (upErr) log(C.red, 'DB ERR', upErr.message);
      }
      done++;
    }

    if (i < toProcess.length - 1) await delay(4000, 7000);
  }

  console.log(`\n${C.bright}${C.cyan}${'─'.repeat(54)}${C.reset}`);
  console.log(`${C.bright}${C.green}  Salvati:          ${done}${C.reset}`);
  console.log(`${C.bright}${C.yellow}  Senza varianti:   ${skipped}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  Con immagini/var: ${withImages}${C.reset}`);
  if (dryRun) console.log(`${C.bright}${C.yellow}  DRY RUN — nessun salvataggio effettuato${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'─'.repeat(54)}${C.reset}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
