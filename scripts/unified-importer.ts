#!/usr/bin/env tsx
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║     KITWER UNIFIED IMPORTER — 360° Performance Suite         ║
 * ║                                                              ║
 * ║  Uso:                                                        ║
 * ║    npx tsx scripts/unified-importer.ts                       ║
 * ║    npx tsx scripts/unified-importer.ts --dry-run             ║
 * ║    npx tsx scripts/unified-importer.ts --upsert              ║
 * ║    npx tsx scripts/unified-importer.ts --no-asin             ║
 * ║    npx tsx scripts/unified-importer.ts --no-asin --upsert    ║
 * ║    npx tsx scripts/unified-importer.ts --permissive          ║
 * ║    npx tsx scripts/unified-importer.ts --hard-reset --force  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * BUG FIXES vs unified-importer.ts originale:
 *  #1  parsePrice: gestisce "1.234,56" e "1,234.56" europeo/americano
 *  #2  commercialRound: soglia 0.50 corretta (non 0.90 ovunque)
 *  #3  applyPriceFormula: NaN→0 + is_price_pending: true
 *  #4  images_urls → image_urls (campo DB corretto)
 *  #5  active: true rimosso (campo non esiste in schema)
 *  #6  .single() → .maybeSingle() (no throw su 0 risultati)
 *  #7  is_price_pending aggiunto al productData
 *  #8  product_url aggiunto al productData
 *  #9  hard-reset: .not('id','is',null) invece di .neq('id','0')
 *  #10 Errori insert/update: checked e loggati
 *  #11 delay: skip in dry-run e quando non c'è scraping
 *  #12 MAGAZZINO → currency EUR (non USD come era hardcoded)
 *  #13 sub_category, is_budget_king aggiunti al productData
 *  #14 generateAIDescription: controlla res.ok
 *  #15 findAmazonLink: valida ASIN B0... (no false positive)
 *  #16 --no-asin: skip delay, scraping e DeepSeek (100% reliable)
 *  #17 --hard-reset + --no-asin: guard di sicurezza
 *  #18 FLAT_FEE 3.99 aggiunto alla formula prezzo
 *  #19 Batch insert Supabase (50 prodotti/batch in no-asin mode)
 *  #20 CATEGORY_MAP completo (da kitwer-tools.ts)
 *  #21 Column aliases flessibili per CSV headers
 *  #22 Progress % tracker per ogni prodotto
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve, join, basename, extname } from 'path';
import * as XLSX from 'xlsx';

// ── ENV loader ────────────────────────────────────────────────────
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

// ── Colori terminale ──────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  red: '\x1b[31m', magenta: '\x1b[35m', blue: '\x1b[34m',
  gray: '\x1b[90m',
};
const log = (color: string, tag: string, msg: string) => {
  const ts = new Date().toLocaleTimeString('it-IT');
  console.log(`${C.gray}${ts}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);
};
const hr = (char = '─', width = 58, color = C.cyan) =>
  console.log(`${C.bright}${color}${char.repeat(width)}${C.reset}`);
const banner = (title: string, sub = '') => {
  hr('═'); console.log(`${C.bright}${C.cyan}  ${title}${C.reset}`);
  if (sub) console.log(`${C.gray}  ${sub}${C.reset}`); hr('═'); console.log();
};

// ── Supabase singleton ────────────────────────────────────────────
let _sb: SupabaseClient | null = null;
const getSupabase = (): SupabaseClient => {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) { log(C.red, 'FATAL', 'Variabili Supabase mancanti in .env.local'); process.exit(1); }
  _sb = createClient(url, key);
  return _sb;
};

// ── Delay anti-bot (FIX #11: skip in dry-run e no-asin) ──────────
const delay = (min = 4000, max = 7000): Promise<void> => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  log(C.yellow, 'PAUSA', `Anti-bot: ${(ms / 1000).toFixed(1)}s...`);
  return new Promise(r => setTimeout(r, ms));
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
];
let _uaIdx = 0;
const nextUA = () => USER_AGENTS[_uaIdx++ % USER_AGENTS.length];

// ── Costanti prezzi ───────────────────────────────────────────────
const AFFILIATE_TAG   = 'kitwer26-21';
const USD_TO_EUR_RATE = 0.92;  // FIX #12 era 1.0 in kitwer-tools, ora tasso reale
const MARKUP_RATE     = 1.20;
const FLAT_FEE        = 3.99;  // FIX #18 mancava nel file originale

// ── Prezzi ───────────────────────────────────────────────────────
// FIX #1: gestisce "1.234,56" europeo e "1,234.56" americano
function parsePrice(input: string): number {
  if (!input || typeof input !== 'string') return NaN;
  let s = input.replace(/[€$£¥\s]/g, '').trim();
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // Europeo: 1.234,56 → il punto è separatore migliaia
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, ''); // Americano: 1,234.56
  } else if (hasComma) { s = s.replace(',', '.'); }
  const v = parseFloat(s);
  return isNaN(v) || v < 0 ? NaN : v;
}

// FIX #2: commercialRound corretto — .90 se < .50, altrimenti .99
function commercialRound(value: number): number {
  const floor = Math.floor(value);
  const frac  = value - floor;
  return frac < 0.50 ? floor + 0.90 : floor + 0.99;
}

// FIX #3: formula completa con FLAT_FEE, mai NaN al DB
function applyPriceFormula(base: number, currency: 'EUR' | 'USD' | 'UNKNOWN'): { price: number; isPending: boolean } {
  if (isNaN(base) || base <= 0) return { price: 0, isPending: true };
  const eur = currency === 'USD' ? base * USD_TO_EUR_RATE : base;
  return { price: commercialRound(eur * MARKUP_RATE + FLAT_FEE), isPending: false };
}

// ── Slug ─────────────────────────────────────────────────────────
function toSlug(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[°"'&/\\[\](){}]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Categoria completa (FIX #20) ─────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'fpv': 'fpv-drones-tech', 'cinewhoop': 'fpv-drones-tech', 'quadcopter': 'fpv-drones-tech',
  'betafpv': 'fpv-drones-tech', 'iflight': 'fpv-drones-tech', 'geprc': 'fpv-drones-tech',
  'hglrc': 'fpv-drones-tech', 'radiomaster': 'fpv-drones-tech', 'fatshark': 'fpv-drones-tech',
  'diatone': 'fpv-drones-tech', 'frsky': 'fpv-drones-tech', 'drone': 'fpv-drones-tech',
  'elrs': 'fpv-drones-tech', 'crossfire': 'fpv-drones-tech',
  'ledger': 'hardware-crypto-wallets', 'trezor': 'hardware-crypto-wallets',
  'tangem': 'hardware-crypto-wallets', 'bitcoin': 'hardware-crypto-wallets',
  'crypto': 'hardware-crypto-wallets', 'wallet': 'hardware-crypto-wallets',
  'seed': 'hardware-crypto-wallets', 'cold storage': 'hardware-crypto-wallets',
  'power station': 'tactical-power-grid', 'powerbank': 'tactical-power-grid',
  'solar': 'tactical-power-grid', 'battery': 'tactical-power-grid',
  'bluetti': 'tactical-power-grid', 'jackery': 'tactical-power-grid',
  'ecoflow': 'tactical-power-grid', 'charger': 'tactical-power-grid',
  'yubikey': 'comms-security-shield', 'yubico': 'comms-security-shield',
  'privacy screen': 'comms-security-shield', 'faraday': 'comms-security-shield',
  'rfid': 'comms-security-shield', 'fido': 'comms-security-shield',
  'racing': 'sim-racing-accessories-premium', 'cockpit': 'sim-racing-accessories-premium',
  'fanatec': 'sim-racing-accessories-premium', 'thrustmaster': 'sim-racing-accessories-premium',
  'moza': 'sim-racing-accessories-premium', 'pedals': 'sim-racing-accessories-premium',
  'wheel': 'sim-racing-accessories-premium', 'sim': 'sim-racing-accessories-premium',
  'monitor arm': 'trading-gaming-desk-accessories-premium',
  'monitor': 'trading-gaming-desk-accessories-premium',
  'chair': 'trading-gaming-desk-accessories-premium',
  'gaming': 'trading-gaming-desk-accessories-premium',
  'desk': 'trading-gaming-desk-accessories-premium',
  'fire starter': 'survival-edc-tech', 'water filter': 'survival-edc-tech',
  'multi-tool': 'survival-edc-tech', 'multitool': 'survival-edc-tech',
  'edc': 'survival-edc-tech', 'survival': 'survival-edc-tech',
  'flashlight': 'survival-edc-tech', 'knife': 'survival-edc-tech',
  'leatherman': 'survival-edc-tech', 'paracord': 'survival-edc-tech',
};

function assignCategory(name: string, csvCat?: string): string {
  if (csvCat?.trim()) {
    const lc = csvCat.toLowerCase().replace(/[-_]+/g, ' ').trim();
    const SLUG_DIRECT: Record<string, string> = {
      'smart security': 'Smart Security', 'smart home': 'Smart Home',
      'pc hardware': 'PC Hardware', '3d printing': '3D Printing',
      'fpv-drones-tech': 'fpv-drones-tech', 'fpv drones tech': 'fpv-drones-tech',
      'hardware-crypto-wallets': 'hardware-crypto-wallets', 'hardware crypto wallets': 'hardware-crypto-wallets',
      'survival-edc-tech': 'survival-edc-tech', 'survival edc tech': 'survival-edc-tech',
      'tactical-power-grid': 'tactical-power-grid', 'tactical power grid': 'tactical-power-grid',
      'comms-security-shield': 'comms-security-shield', 'comms security shield': 'comms-security-shield',
      'sim-racing-accessories-premium': 'sim-racing-accessories-premium',
      'sim racing': 'sim-racing-accessories-premium',
      'trading-gaming-desk-accessories-premium': 'trading-gaming-desk-accessories-premium',
      'gaming desk': 'trading-gaming-desk-accessories-premium',
    };
    if (SLUG_DIRECT[lc]) return SLUG_DIRECT[lc];
  }
  const n = name.toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (n.includes(kw)) return cat;
  }
  return 'UNSORTED';
}

// ── CSV parsing flessibile (FIX #21) ─────────────────────────────
function getField(row: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    const v = row[a] ?? row[a.toLowerCase()] ?? row[a.toUpperCase()];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

// ── ASIN extraction ───────────────────────────────────────────────
function extractAsin(text: string): string | null {
  return text.match(/\/dp\/([A-Z0-9]{10})(?:[/?#%&]|$)/i)?.[1]?.toUpperCase()
      ?? text.match(/\b(B0[A-Z0-9]{8})\b/i)?.[1]?.toUpperCase()
      ?? null;
}

// ── Ricerca link Amazon con DuckDuckGo fallback (da unified) ──────
async function findAmazonLink(productName: string, brand?: string): Promise<string | null> {
  const query = brand ? `${productName} ${brand}` : productName;
  const urls = [
    `https://www.amazon.it/s?k=${encodeURIComponent(query)}&language=it_IT`,
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + ' site:amazon.it')}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.toLowerCase().includes('captcha')) continue;
      // FIX #15: valida che sia un vero ASIN B0... non un ID di sessione
      const m = html.match(/data-asin="(B0[A-Z0-9]{8})"/i) ?? html.match(/\/dp\/(B0[A-Z0-9]{8})/i);
      if (m) return `https://www.amazon.it/dp/${m[1].toUpperCase()}/?tag=${AFFILIATE_TAG}`;
    } catch { continue; }
  }
  return null;
}

// ── Utility: concurrency limiter ──────────────────────────────────
async function runConcurrent<T, R>(
  items: T[],
  fn: (item: T, i: number) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

// ── Quick price fetch da pagina Amazon ───────────────────────────
/**
 * Prova a estrarre il prezzo reale dalla pagina prodotto Amazon.
 * Usa selettori CSS noti; restituisce null se CAPTCHA o parsing fallisce.
 */
async function quickFetchPrice(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.toLowerCase().includes('captcha')) return null;

    // Pattern 1: a-price-whole + a-price-fraction (layout moderno Amazon)
    const whole = html.match(/class="a-price-whole">(\d[\d.]*)</);
    const frac  = html.match(/class="a-price-fraction">(\d+)</);
    if (whole) {
      const w = parseFloat(whole[1].replace(/\./g, '').replace(',', '.'));
      const f = frac ? parseFloat(`0.${frac[1]}`) : 0;
      if (!isNaN(w) && w > 0) return w + f;
    }

    // Pattern 2: meta og:price:amount
    const og = html.match(/<meta[^>]+property=["']og:price:amount["'][^>]+content=["']([\d.,]+)["']/i);
    if (og) {
      const v = parseFloat(og[1].replace(',', '.'));
      if (!isNaN(v) && v > 0) return v;
    }

    // Pattern 3: "priceBlockBuyingPriceString" o "priceBlockSavingsString"
    const alt = html.match(/id="priceblock_ourprice"[^>]*>[\s€$£]*([0-9]+[.,][0-9]{2})/);
    if (alt) {
      const v = parseFloat(alt[1].replace(',', '.'));
      if (!isNaN(v) && v > 0) return v;
    }
  } catch { /* timeout o rete */ }
  return null;
}

// ── Quick rating fetch da pagina Amazon ──────────────────────────
async function quickFetchRating(url: string): Promise<{ rating: number; reviewCount: number } | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.toLowerCase().includes('captcha')) return null;

    // Rating: "4.5 su 5 stelle" pattern
    const ratingM = html.match(/([0-9][.,][0-9])\s*(?:su|out of)\s*5\s*(?:stelle|stars)/i)
                 ?? html.match(/averageStarRating[^>]*>\s*([0-9][.,][0-9])/i)
                 ?? html.match(/"ratingScore"\s*:\s*"([0-9.]+)"/i);
    const rating = ratingM ? parseFloat(ratingM[1].replace(',', '.')) : 0;

    // Recensioni: "1.248 recensioni" o "1,248 ratings"
    const revM = html.match(/([\d.,]+)\s*(?:recensioni|valutazioni|ratings?)/i)
              ?? html.match(/"reviewCount"\s*:\s*"?([\d.,]+)"?/i);
    const reviewCount = revM
      ? parseInt(revM[1].replace(/[.,]/g, '').replace(/\./g, ''), 10)
      : 0;

    if (rating > 0) return { rating, reviewCount };
  } catch { /* timeout */ }
  return null;
}

// ── Quick image fetch (no ASIN) — solo OG image da pagina ricerca ──
async function quickFetchImage(productName: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.amazon.it/s?k=${encodeURIComponent(productName)}`,
      { headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' }, signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return '/placeholder.svg';
    const html = await res.text();
    if (html.toLowerCase().includes('captcha')) return '/placeholder.svg';
    // 1. Primo risultato di ricerca: immagine prodotto con s-image
    const sImg = html.match(/<img[^>]+class="[^"]*s-image[^"]*"[^>]*src="(https:[^"]+)"/i);
    if (sImg?.[1]) return sImg[1];
    // 2. Fallback OG image
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](https:[^"']+)["']/i);
    if (og?.[1]) return og[1];
  } catch { /* timeout o errore rete */ }
  return '/placeholder.svg';
}

// ── Scraping immagini + varianti ──────────────────────────────────
async function scrapeAmazonData(asin: string): Promise<{ images: string[]; variants: unknown[] } | null> {
  try {
    const res = await fetch(`https://www.amazon.it/dp/${asin}/`, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.toLowerCase().includes('captcha')) return null;

    const images: string[] = [];
    const ciM = html.match(/"colorImages"\s*:\s*(\{[\s\S]{10,8000}?\})\s*[,}]/);
    if (ciM?.[1]) {
      try {
        const ci = JSON.parse(ciM[1]) as Record<string, Array<{ hiRes?: string; large?: string }>>;
        for (const e of ci['initial'] ?? []) { const u = e.hiRes ?? e.large; if (u) images.push(u); }
      } catch { /* ignora */ }
    }
    if (images.length === 0) {
      const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
      if (og?.[1]) images.push(og[1]);
      else images.push(`https://m.media-amazon.com/images/I/${asin}._AC_SL500_.jpg`);
    }

    const variants: unknown[] = [];
    const dvM = html.match(/"dimensionValuesDisplayData"\s*:\s*(\{[^}]{1,2000}\})/);
    if (dvM?.[1]) {
      try {
        const raw = JSON.parse(dvM[1]) as Record<string, string[]>;
        for (const [name, vals] of Object.entries(raw)) {
          if (Array.isArray(vals) && vals.length)
            variants.push({ name, values: vals.map(v => v.trim()).filter(Boolean) });
        }
      } catch { /* ignora */ }
    }

    return { images: Array.from(new Set(images)), variants };
  } catch { return null; }
}

// FIX #14: controlla res.ok ────────────────────────────────────────
async function generateAIDescription(name: string, category: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return '';
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'Sei un copywriter di lusso specializzato in tecnologia e sicurezza. Scrivi descrizioni in HTML puro (solo <p>, <strong>), italiano, tono sofisticato. Massimo 120 parole.' },
          { role: 'user', content: `Prodotto: "${name}"\nCategoria: "${category}"` },
        ],
        max_tokens: 280, temperature: 0.82,
      }),
    });
    if (!res.ok) { log(C.red, 'DEEPSEEK', `API error ${res.status}`); return ''; }
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? '';
  } catch { return ''; }
}

// ── RFC 4180-compliant CSV parser ────────────────────────────────
/** Splits a single CSV line respecting quoted fields (handles commas and escaped quotes inside quotes). */
function parseCsvLine(line: string): string[] {
  const vals: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // escaped ""
        else inQuote = false;
      } else { cur += ch; }
    } else {
      if (ch === '"') { inQuote = true; }
      else if (ch === ',') { vals.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
  }
  vals.push(cur.trim());
  return vals;
}

// ── Lettura file CSV/XLSX ─────────────────────────────────────────
interface ProductRow {
  name: string; rawPrice: string; csvCategory: string; subCategory: string;
  asin: string | null; link: string | null; currency: 'EUR' | 'USD' | 'UNKNOWN';
  brand: string; filename: string;
  rating: number;      // 0 = non disponibile
  reviewCount: number; // 0 = non disponibile
}

function readFile(filePath: string): ProductRow[] {
  const ext = extname(filePath).toLowerCase();
  let rows: Record<string, string>[];

  if (ext === '.xlsx') {
    const wb = XLSX.readFile(filePath);
    rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  } else {
    // FIX: CSV nativo per preservare encoding e separatori
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    rows = lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = parseCsvLine(line);
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj;
    });
  }

  const filename = basename(filePath);
  // FIX #12: MAGAZZINO usa EUR (non USD)
  const lc = filename.toLowerCase();
  const currency: 'EUR' | 'USD' | 'UNKNOWN' =
    lc.includes('usd') ? 'USD' : lc.includes('eur') ? 'EUR' : 'EUR';

  return rows
    .map(r => {
      const name = getField(r, 'nome_prodotto', 'nome', 'prodotto', 'name', 'Name', 'Prodotto', 'Nome');
      if (!name || /^INSERIRE_/i.test(name)) return null;
      const rawLink = getField(r, 'url', 'URL', 'link', 'Link', 'affiliate_url');
      return {
        name,
        rawPrice:    getField(r, 'prezzo_eur', 'prezzo_usd', 'prezzo', 'price', 'Prezzo', 'Price'),
        csvCategory: getField(r, 'categoria', 'category', 'Categoria', 'Category'),
        subCategory: getField(r, 'sottocategoria', 'sub_category', 'subcategory'),
        asin:   extractAsin(rawLink),
        link:   rawLink || null,
        currency,
        brand:  getField(r, 'marca', 'brand', 'Marca', 'Brand'),
        filename,
        rating:      parseFloat(getField(r, 'rating', 'stelle', 'valutazione', 'stars', 'Rating') || '0') || 0,
        reviewCount: parseInt(getField(r, 'recensioni', 'review_count', 'reviews', 'Recensioni') || '0', 10) || 0,
      } satisfies ProductRow;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

// ── Enrich images: aggiorna prodotti con placeholder.svg ──────────
// limit: max prodotti da processare per evitare timeout Vercel (default 10)
async function enrichImages(limit = 10) {
  const supabase = getSupabase();
  banner('UNIFIED IMPORTER — Enrich Images', `Aggiornamento immagini placeholder → Amazon (max ${limit} prodotti)`);

  // Leggi i primi `limit` prodotti senza immagine reale
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .or('image_url.eq./placeholder.svg,image_url.is.null,image_url.eq.')
    .limit(limit);

  if (error) { log(C.red, 'DB', error.message); return; }
  if (!data || data.length === 0) {
    log(C.green, 'DONE', 'Nessun prodotto senza immagine trovato.');
    return;
  }

  log(C.cyan, 'SCAN', `${data.length} prodotti senza immagine — inizio arricchimento (max ${limit})`);

  let updated = 0;
  let failed = 0;

  const images = await runConcurrent(
    data as { id: string; name: string }[],
    (p) => quickFetchImage(p.name),
    5
  );

  for (let i = 0; i < data.length; i++) {
    const imgUrl = images[i];
    if (imgUrl.includes('placeholder')) { failed++; log(C.yellow, 'SKIP', `"${data[i].name}" — nessuna immagine trovata`); continue; }
    const { error: upErr } = await supabase
      .from('products')
      .update({ image_url: imgUrl, image_urls: [imgUrl] })
      .eq('id', (data[i] as { id: string }).id);
    if (upErr) { log(C.red, 'ERR', `"${data[i].name}": ${upErr.message}`); failed++; }
    else { log(C.green, 'IMG', `✓ "${data[i].name}"`); updated++; }
  }

  log(C.green, 'DONE', `Arricchimento completato: ${updated} aggiornati, ${failed} senza immagine su ${data.length} processati.`);
}

// ── Remove no-image: elimina prodotti ancora con placeholder ──────
async function removeNoImage() {
  const supabase = getSupabase();
  banner('UNIFIED IMPORTER — Remove No-Image', 'Elimina prodotti senza immagine reale');

  // Step 1: null / placeholder / stringa vuota
  const { data: noImg, error: selErr } = await supabase
    .from('products')
    .select('id, name, image_url')
    .or('image_url.eq./placeholder.svg,image_url.is.null,image_url.eq.');

  if (selErr) { log(C.red, 'DB', selErr.message); return; }

  // Step 2: Amazon URL rotti — due casi:
  //   a) URL senza "._" (nessun resize code) → non è una vera immagine prodotto
  //   b) ASIN usato come image ID (pattern: /images/I/B[9chars].) → fallback rotto dell'importer
  const { data: amazonData, error: amazonErr } = await supabase
    .from('products')
    .select('id, name, image_url')
    .like('image_url', '%m.media-amazon.com%');

  if (amazonErr) { log(C.red, 'DB', amazonErr.message); return; }

  const ASIN_AS_IMAGE = /\/images\/I\/B[A-Z0-9]{9}[._]/i;

  const brokenAmazon = (amazonData ?? []).filter(p => {
    const url = p.image_url as string | null;
    if (!url) return false;
    // Caso a: senza resize code
    if (!url.includes('._')) return true;
    // Caso b: ASIN come image ID
    if (ASIN_AS_IMAGE.test(url)) return true;
    return false;
  });

  // Combina e deduplica per id
  const seen = new Set<string>();
  const toDelete = [...(noImg ?? []), ...brokenAmazon].filter(p => {
    if (seen.has(p.id as string)) return false;
    seen.add(p.id as string);
    return true;
  });

  if (toDelete.length === 0) {
    log(C.green, 'OK', 'Nessun prodotto senza immagine trovato.');
    return;
  }

  log(C.yellow, 'SCAN', `Trovati ${toDelete.length} prodotti da eliminare (${(noImg ?? []).length} placeholder/null + ${brokenAmazon.length} Amazon rotti):`);
  toDelete.forEach(p => log(C.gray, 'DEL', `"${p.name}" → ${p.image_url ?? 'null'}`));

  const ids = toDelete.map(p => p.id as string);
  const { error: delErr } = await supabase.from('products').delete().in('id', ids);

  if (delErr) { log(C.red, 'ERRORE', delErr.message); return; }
  log(C.green, 'DONE', `✓ ${toDelete.length} prodotti eliminati.`);
}

// ── Remove duplicates: rimuove prodotti con stessa image_url ──────
async function removeDuplicates() {
  const supabase = getSupabase();
  banner('UNIFIED IMPORTER — Remove Duplicates', 'Elimina prodotti duplicati per image_url');

  // Carica tutti i prodotti con image_url non null
  const { data: all, error } = await supabase
    .from('products')
    .select('id, name, image_url, price, created_at')
    .not('image_url', 'is', null)
    .order('price', { ascending: true });

  if (error) { log(C.red, 'DB', error.message); return; }
  if (!all || all.length === 0) { log(C.green, 'OK', 'Nessun prodotto trovato.'); return; }

  // Raggruppa per image_url
  const groups = new Map<string, typeof all>();
  for (const p of all) {
    const key = (p.image_url as string).trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const dupGroups = [...groups.values()].filter(g => g.length > 1);
  if (dupGroups.length === 0) {
    log(C.green, 'OK', 'Nessun duplicato trovato.');
    return;
  }

  const toDelete: string[] = [];
  let kept = 0;

  for (const group of dupGroups) {
    // Ordina: prezzo più basso prima (già ordinato dal DB), poi created_at
    const sorted = [...group].sort((a, b) => {
      const pA = parseFloat(String(a.price ?? 9999));
      const pB = parseFloat(String(b.price ?? 9999));
      if (pA !== pB) return pA - pB;
      return new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime();
    });
    const [keep, ...rest] = sorted;
    kept++;
    log(C.cyan, 'KEEP', `"${keep.name}" (€${keep.price}) — ${rest.length} duplicati rimossi`);
    rest.forEach(p => toDelete.push(p.id as string));
  }

  log(C.yellow, 'SCAN', `${dupGroups.length} gruppi duplicati — tengo ${kept}, elimino ${toDelete.length}`);

  // Elimina in batch da 100
  const BATCH = 100;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const { error: delErr } = await supabase.from('products').delete().in('id', batch);
    if (delErr) { log(C.red, 'ERRORE', delErr.message); return; }
  }

  log(C.green, 'DONE', `✓ ${toDelete.length} duplicati eliminati. ${kept} prodotti unici mantenuti.`);
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  const cliArgs   = process.argv.slice(2);
  const dryRun    = cliArgs.includes('--dry-run');
  const upsert    = cliArgs.includes('--upsert');
  const permissive = cliArgs.includes('--permissive');
  const hardReset = cliArgs.includes('--hard-reset');
  const force     = cliArgs.includes('--force');
  const noAsin    = cliArgs.includes('--no-asin');
  const enrichImagesMode      = cliArgs.includes('--enrich-images');
  const removeNoImageMode     = cliArgs.includes('--remove-no-image');
  const removeDuplicatesMode  = cliArgs.includes('--remove-duplicates');
  const limitArg = cliArgs.find(a => a.startsWith('--limit='));
  const enrichLimit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 10;

  if (enrichImagesMode)     { await enrichImages(enrichLimit);     return; }
  if (removeNoImageMode)    { await removeNoImage();    return; }
  if (removeDuplicatesMode) { await removeDuplicates(); return; }

  // FIX #17: guard incompatibilità flag
  if (hardReset && noAsin) {
    log(C.red, 'FATAL', '--hard-reset e --no-asin non possono essere usati insieme.');
    process.exit(1);
  }

  const label = dryRun ? 'DRY-RUN' : noAsin ? 'NO-ASIN (diretto)' : upsert ? 'UPSERT' : 'IMPORT';
  banner('KITWER UNIFIED IMPORTER', label);

  const supabase = getSupabase();

  // Verifica connessione
  const { error: connErr } = await supabase.from('products').select('id').limit(1);
  if (connErr && !connErr.message.includes('does not exist')) {
    log(C.red, 'FATAL', `Supabase: ${connErr.message}`); process.exit(1);
  }
  log(C.green, 'DB', 'Connesso a Supabase');

  // FIX #9: hard-reset con .not('id','is',null)
  if (hardReset) {
    if (!force) {
      log(C.red, 'ERRORE', 'Usa --force per confermare il hard-reset.');
      process.exit(1);
    }
    log(C.red, 'HARD-RESET', '⚠ Svuotamento tabella products...');
    const { error } = await supabase.from('products').delete().not('id', 'is', null);
    if (error) { log(C.red, 'ERRORE', error.message); process.exit(1); }
    log(C.green, 'HARD-RESET', '✓ Tabella svuotata');
  }

  // Scansione file (MAGAZZINO + ARCHIVIO.PROD)
  const MAGAZZINO = resolve(process.cwd(), 'MAGAZZINO');
  const ARCHIVIO  = resolve(process.cwd(), 'ARCHIVIO.PROD');
  const cliFiles  = cliArgs.filter(a => /\.(csv|xlsx)$/i.test(a));
  const allFiles: string[] = [];

  if (cliFiles.length > 0) {
    for (const f of cliFiles) {
      const p = existsSync(f) ? f : join(MAGAZZINO, basename(f));
      if (existsSync(p)) allFiles.push(p);
      else log(C.yellow, 'WARN', `File non trovato: ${f}`);
    }
  } else {
    for (const dir of [MAGAZZINO, ARCHIVIO]) {
      if (!existsSync(dir)) continue;
      readdirSync(dir).filter(f => /\.(csv|xlsx)$/i.test(f)).forEach(f => allFiles.push(join(dir, f)));
    }
  }

  if (allFiles.length === 0) { log(C.yellow, 'INFO', 'Nessun file CSV/XLSX trovato'); return; }
  log(C.cyan, 'SCAN', `${allFiles.length} file: ${allFiles.map(f => basename(f)).join(', ')}`);

  // Leggi tutti i prodotti
  const allProducts: ProductRow[] = [];
  for (const f of allFiles) {
    const rows = readFile(f);
    log(C.blue, 'FILE', `${basename(f)} — ${rows.length} prodotti`);
    allProducts.push(...rows);
  }
  log(C.cyan, 'TOTALE', `${allProducts.length} prodotti da elaborare`);

  // ── Modalità NO-ASIN: batch insert veloce ────────────────────────
  if (noAsin) {
    log(C.cyan, 'NO-ASIN', 'Modalità import diretto — nessuno scraping');
    const BATCH = 50;
    let saved = 0, skipped = 0, failed = 0;
    // Dedup globale per slug — previene collisioni across batch
    const globalSeenSlugs = new Set<string>();

    for (let i = 0; i < allProducts.length; i += BATCH) {
      const batch = allProducts.slice(i, i + BATCH);

      // Fetch immagini in parallelo (5 concurrent, 5s timeout) — skip in dry-run
      let batchImages: string[];
      if (dryRun) {
        batchImages = batch.map(() => '/placeholder.svg');
      } else {
        log(C.cyan, 'IMAGES', `Recupero immagini ${i + 1}–${Math.min(i + BATCH, allProducts.length)}/${allProducts.length} (parallelo ×5)...`);
        batchImages = await runConcurrent(batch, (p) => {
          // Se il CSV contiene già un link Amazon valido, usa quello come URL prodotto
          // ma cerca comunque l'immagine dalla ricerca
          return quickFetchImage(p.name);
        }, 5);
        const withImg = batchImages.filter(u => !u.includes('placeholder')).length;
        log(withImg > 0 ? C.green : C.yellow, 'IMAGES', `${withImg}/${batch.length} immagini reali trovate`);
      }

      // Se ci sono prezzi mancanti E un link Amazon, prova fetch prezzo in parallelo
      const pendingPriceIdxs = batch
        .map((p, j) => ({ p, j }))
        .filter(({ p }) => {
          const { isPending } = applyPriceFormula(parsePrice(p.rawPrice), p.currency);
          return isPending && !!p.link;
        });

      const fetchedPrices = new Map<number, number>();
      if (!dryRun && pendingPriceIdxs.length > 0) {
        log(C.yellow, 'PRICE', `Recupero ${pendingPriceIdxs.length} prezzi mancanti da Amazon...`);
        await runConcurrent(pendingPriceIdxs, async ({ p, j }) => {
          const fetched = await quickFetchPrice(p.link!);
          if (fetched) { fetchedPrices.set(j, fetched); log(C.green, 'PRICE', `✓ "${p.name}": €${fetched}`); }
        }, 3);
      }

      const rows = batch.map((p, j) => {
        const rawPriceStr = p.rawPrice || (fetchedPrices.has(j) ? String(fetchedPrices.get(j)) : '');
        const { price, isPending } = applyPriceFormula(parsePrice(rawPriceStr), p.currency);
        const category = assignCategory(p.name, p.csvCategory);
        const imgUrl   = batchImages[j];
        return {
          name:             p.name,
          category,
          price,
          is_price_pending: isPending,
          is_budget_king:   !isPending && price < 30,
          image_url:        imgUrl,
          image_urls:       [imgUrl],
          product_url:      p.link ?? `https://www.amazon.it/s?k=${encodeURIComponent(p.name)}`,
          variants:         [],
          description:      '',
          ...(p.rating      > 0 ? { rating:       p.rating }      : {}),
          ...(p.reviewCount > 0 ? { review_count: p.reviewCount } : {}),
          ...(p.subCategory ? { sub_category: p.subCategory } : {}),
          slug:             toSlug(p.name),
        };
      });

      // Deduplica per slug (globale across batch) — previene collisioni unique constraint
      const uniqueRows = rows.filter(r => {
        if (globalSeenSlugs.has(r.slug)) return false;
        globalSeenSlugs.add(r.slug);
        return true;
      });
      const dupes = rows.length - uniqueRows.length;
      if (dupes > 0) log(C.yellow, 'DEDUP', `${dupes} duplicati rimossi dal batch`);

      if (dryRun) {
        uniqueRows.forEach(r => log(C.gray, 'DRY', `${r.name} | ${r.category} | €${r.price}`));
        saved += uniqueRows.length;
      } else {
        const { error } = upsert
          ? await supabase.from('products').upsert(uniqueRows, { onConflict: 'slug' })
          : await supabase.from('products').insert(uniqueRows);

        if (error) {
          log(C.red, 'ERRORE-BATCH', error.message);
          // Fallback: inserisci uno per uno per isolare il prodotto problematico
          log(C.yellow, 'RETRY', 'Fallback: insert singolo per isolare errori...');
          for (const row of uniqueRows) {
            const { error: singleErr } = upsert
              ? await supabase.from('products').upsert(row, { onConflict: 'slug' })
              : await supabase.from('products').insert(row);
            if (singleErr) {
              log(C.red, 'SKIP', `"${row.name}": ${singleErr.message}`);
              failed++;
            } else {
              saved++;
            }
          }
        } else {
          log(C.green, 'BATCH', `✓ ${i + batch.length}/${allProducts.length} — +${uniqueRows.length} salvati`);
          saved += uniqueRows.length;
        }
      }
    }

    hr();
    console.log(`${C.bright}${C.green}  ✓ Salvati  : ${saved}${C.reset}`);
    if (failed) console.log(`${C.bright}${C.red}  ✗ Falliti  : ${failed}${C.reset}`);
    hr();
    return;
  }

  // ── Modalità NORMALE: 1 prodotto alla volta con scraping ─────────
  let saved = 0, skipped = 0, failed = 0, rejected = 0;

  for (let i = 0; i < allProducts.length; i++) {
    const p = allProducts[i];
    const pct = `${Math.round(((i + 1) / allProducts.length) * 100)}%`;
    console.log(`\n${C.bright}${C.yellow}── [${i + 1}/${allProducts.length}] (${pct}) ${p.name} ──${C.reset}`);

    try {
      // Check duplicato
      const { data: existing } = await supabase.from('products')
        .select('id').eq('name', p.name).maybeSingle(); // FIX #6: maybeSingle

      if (existing && !upsert) {
        log(C.blue, 'SKIP', `"${p.name}" già nel DB`);
        skipped++; continue;
      }

      // Categoria
      const category = assignCategory(p.name, p.csvCategory);
      if (category === 'UNSORTED' && !permissive) {
        log(C.red, 'SCARTATO', `"${p.name}" — categoria sconosciuta`);
        rejected++; continue;
      }

      // ASIN: CSV → testo nome → ricerca Amazon (con DDG fallback)
      let asin = p.asin ?? extractAsin(p.name);
      let link = p.link ?? null;
      let didScrape = false;

      if (!asin) {
        log(C.yellow, 'SEARCH', `Cerco link per "${p.name}"...`);
        link = await findAmazonLink(p.name, p.brand || undefined);
        if (link) { asin = extractAsin(link); log(C.green, 'LINK', `${link}`); }
        didScrape = true;
      }

      if (!asin) {
        log(C.red, 'SCARTATO', `"${p.name}" — ASIN non trovato`);
        rejected++; continue;
      }

      const productUrl = `https://www.amazon.it/dp/${asin}/?tag=${AFFILIATE_TAG}`;

      // Immagini + varianti
      let images: string[] = ['/placeholder.svg'];
      let variants: unknown[] = [];
      const scraped = await scrapeAmazonData(asin);
      if (scraped) { images = scraped.images; variants = scraped.variants; }
      didScrape = true;

      // FIX #3: prezzo con is_price_pending
      const { price, isPending } = applyPriceFormula(parsePrice(p.rawPrice), p.currency);

      // Descrizione AI
      const description = await generateAIDescription(p.name, category);

      // FIX #4 #5 #7 #8 #13 #19: tutti i campi corretti
      const row = {
        name:             p.name,
        category,
        price,
        is_price_pending: isPending,
        is_budget_king:   !isPending && price < 30,
        image_url:        images[0] ?? '/placeholder.svg',
        image_urls:       images,          // FIX #4: era images_urls
        product_url:      productUrl,      // FIX #8
        asin,
        variants,
        description,
        ...(p.rating      > 0 ? { rating:       p.rating }      : {}),
        ...(p.reviewCount > 0 ? { review_count: p.reviewCount } : {}),
        slug:             toSlug(p.name),
        ...(p.subCategory ? { sub_category: p.subCategory } : {}),
        // FIX #5: rimosso "active: true" (campo inesistente)
      };

      if (dryRun) {
        log(C.gray, 'DRY', `${p.name} | ${category} | €${price} | ASIN: ${asin}`);
        saved++;
      } else {
        // FIX #10: controlla errori di insert/update
        const { error } = existing && upsert
          ? await supabase.from('products').upsert(row, { onConflict: 'slug' })
          : await supabase.from('products').insert(row);

        if (error) {
          log(C.red, 'ERRORE-DB', `"${p.name}": ${error.message}`);
          failed++;
        } else {
          log(C.green, existing ? 'AGGIORNATO' : 'SALVATO', `✓ [${i + 1}/${allProducts.length}] "${p.name}"`);
          saved++;
        }
      }

      // FIX #11: delay solo quando c'è stato scraping, mai in dry-run
      if (didScrape && !dryRun && i < allProducts.length - 1) await delay(4000, 7000);

    } catch (e) {
      log(C.red, 'ERRORE', `"${p.name}": ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  }

  hr();
  console.log(`${C.bright}${C.green}  ✓ Salvati   : ${saved}${C.reset}`);
  console.log(`${C.bright}${C.blue}  ↺ Già nel DB : ${skipped}${C.reset}`);
  console.log(`${C.bright}${C.red}  ✗ Scartati   : ${rejected}${C.reset}`);
  if (failed) console.log(`${C.bright}${C.red}  ✗ Errori DB  : ${failed}${C.reset}`);
  hr();
}

main().catch(e => {
  console.error(`\x1b[31m[FATAL] ${e instanceof Error ? e.message : String(e)}\x1b[0m`);
  process.exit(1);
});
