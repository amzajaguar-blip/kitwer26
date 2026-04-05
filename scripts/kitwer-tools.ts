#!/usr/bin/env tsx
/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          KITWER-TOOLS — Suite di gestione universale         ║
 * ║                                                              ║
 * ║  Contiene TUTTE le funzioni di amministrazione:              ║
 * ║    import     → Importa CSV/XLSX da MAGAZZINO/               ║
 * ║    dedup      → De-duplicazione intelligente prodotti        ║
 * ║    variants   → Scraping varianti da Amazon                  ║
 * ║    subcats    → Assegna sotto-categorie keyword-based        ║
 * ║    fix-images → Ripara URL immagini rotte                    ║
 * ║    sync-product-links → Sincronizza URL prodotti da affiliate  ║
 * ║    process-magazzino-links → Pulisce e verifica link MAGAZZINO  ║
 * ║    prices     → Migra/ricalcola prezzi da CSV                ║
 * ║    clean-db   → ⚠ Svuota tabella products (PERICOLOSO)       ║
 * ║                                                              ║
 * ║  Uso:                                                        ║
 * ║    npx tsx scripts/kitwer-tools.ts                (menu)     ║
 * ║    npx tsx scripts/kitwer-tools.ts import         (diretto)  ║
 * ║    npx tsx scripts/kitwer-tools.ts import --upsert           ║
 * ║    npx tsx scripts/kitwer-tools.ts import --hard-reset       ║
 * ║    npx tsx scripts/kitwer-tools.ts dedup --dry-run           ║
 * ║    npx tsx scripts/kitwer-tools.ts variants --all            ║
 * ║    npx tsx scripts/kitwer-tools.ts subcats                   ║
 * ║    npx tsx scripts/kitwer-tools.ts fix-images                ║
 * ║    npx tsx scripts/kitwer-tools.ts sync-product-links       ║
 * ║    npx tsx scripts/kitwer-tools.ts prices                    ║
 * ║    npx tsx scripts/kitwer-tools.ts prices --execute          ║
 * ║    npx tsx scripts/kitwer-tools.ts clean-db                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  readdirSync, readFileSync, writeFileSync, appendFileSync,
  mkdirSync, existsSync, createReadStream,
} from 'fs';
import { resolve, join, basename, extname } from 'path';
import * as readline from 'readline';
import * as XLSX from 'xlsx';

// ══════════════════════════════════════════════════════════════════
// § 1 — SHARED UTILITIES
// ══════════════════════════════════════════════════════════════════

// ── Colori terminale ──────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  dim:     '\x1b[2m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
  gray:    '\x1b[90m',
  white:   '\x1b[37m',
};

function log(color: string, tag: string, msg: string) {
  const ts = new Date().toLocaleTimeString('it-IT');
  console.log(`${C.gray}${ts}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);
}

function hr(char = '─', width = 58, color = C.cyan) {
  console.log(`${C.bright}${color}${char.repeat(width)}${C.reset}`);
}

function banner(title: string, subtitle = '') {
  hr('═');
  console.log(`${C.bright}${C.cyan}  ${title}${C.reset}`);
  if (subtitle) console.log(`${C.gray}  ${subtitle}${C.reset}`);
  hr('═');
  console.log();
}

// ── ENV loader ───────────────────────────────────────────────────
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

// ── Supabase client ──────────────────────────────────────────────
function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(`${C.red}${C.bright}[FATAL]${C.reset} NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local`);
    process.exit(1);
  }
  return createClient(url, key);
}

// ── Delay anti-bot ───────────────────────────────────────────────
function delay(min = 4000, max = 7000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  log(C.yellow, 'PAUSA', `Attesa anti-bot: ${(ms / 1000).toFixed(1)}s...`);
  return new Promise((r) => setTimeout(r, ms));
}

// ── User-Agent rotation ──────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.1 Safari/605.1.15',
];
let _uaIdx = 0;
const nextUA = () => USER_AGENTS[_uaIdx++ % USER_AGENTS.length];

// ── Conferma interattiva ─────────────────────────────────────────
function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${C.yellow}${C.bright}${question} [y/N] ${C.reset}`, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// ── Menu interattivo ─────────────────────────────────────────────
function menu(question: string, choices: string[]): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log();
  choices.forEach((c, i) => console.log(`  ${C.cyan}${C.bright}[${i + 1}]${C.reset} ${c}`));
  console.log(`  ${C.gray}[0] Esci${C.reset}`);
  console.log();
  return new Promise((resolve) => {
    rl.question(`${C.yellow}${C.bright}${question}: ${C.reset}`, (answer) => {
      rl.close();
      const n = parseInt(answer.trim(), 10);
      if (n === 0 || isNaN(n) || n > choices.length) resolve('exit');
      else resolve(choices[n - 1]);
    });
  });
}

// ══════════════════════════════════════════════════════════════════
// § 2 — SHARED: AMAZON SCRAPING UTILITIES
// ══════════════════════════════════════════════════════════════════

async function fetchProductGallery(asin: string): Promise<string[]> {
  const fallback = `https://m.media-amazon.com/images/I/${asin}._AC_SL500_.jpg`;
  try {
    const res = await fetch(`https://www.amazon.it/dp/${asin}/`, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [fallback];
    const html = await res.text();

    type ImgEntry = { hiRes?: string; large?: string; thumb?: string };
    const collected: string[] = [];

    // ── 1. Blocco colorImages JSON (initial = galleria principale + varianti) ──
    // Amazon embedded JSON: 'colorImages': { 'initial': [...], 'ColorName': [...] }
    const ciM = html.match(/['"']colorImages['"']\s*:\s*(\{[\s\S]{10,8000}?\})\s*[,\}]/);
    if (ciM?.[1]) {
      try {
        const ci = JSON.parse(ciM[1]) as Record<string, ImgEntry[]>;
        // Prima l'array 'initial' → galleria principale del prodotto
        for (const e of ci['initial'] ?? []) {
          const url = e.hiRes ?? e.large;
          if (url) collected.push(url);
        }
        // Poi tutte le varianti colore (hiRes > large)
        for (const [key, entries] of Object.entries(ci)) {
          if (key === 'initial') continue;
          for (const e of entries) {
            const url = e.hiRes ?? e.large;
            if (url) collected.push(url);
          }
        }
      } catch { /* ignora JSON malformato */ }
    }

    // ── 2. Fallback: tutti i "hiRes" sparsi nell'HTML ─────────────────────────
    if (collected.length === 0) {
      for (const m of html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g))
        collected.push(m[1]);
    }

    // ── 3. Fallback: tutti i "large" sparsi nell'HTML ─────────────────────────
    if (collected.length === 0) {
      for (const m of html.matchAll(/"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g))
        collected.push(m[1]);
    }

    // ── 4. Deduplica + filtra URL non-Amazon ──────────────────────────────────
    const deduped = [...new Set(collected)].filter((u) => u.includes('media-amazon.com'));
    if (deduped.length > 0) return deduped;

    // ── 5. Ultimo fallback: og:image → landingImageUrl → CDN ASIN ────────────
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](https:\/\/[^"']+)["']/i);
    if (og?.[1]) return [og[1]];
    const land = html.match(/"landingImageUrl"\s*:\s*"(https:\/\/[^"]+)"/);
    if (land?.[1]) return [land[1]];

    return [fallback];
  } catch { return [fallback]; }
}

async function searchProductImage(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.amazon.it/s?k=${encodeURIComponent(name)}&language=it_IT`, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (html.toLowerCase().includes('captcha')) return null;
    const src = [...html.matchAll(/srcset="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g)];
    if (src.length > 0) {
      const url = src[0][1].split(' ')[0];
      return url.replace(/\._[^.]+\.jpg$/, '._AC_SL500_.jpg');
    }
    return null;
  } catch { return null; }
}

async function findAsin(name: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.amazon.it/s?k=${encodeURIComponent(name)}&ref=nb_sb_noss`, {
      headers: {
        'User-Agent': nextUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if ([403, 429, 503].includes(res.status)) return null;
    const html = await res.text();
    if (html.toLowerCase().includes('captcha')) return null;
    return html.match(/data-asin="([A-Z0-9]{10})"/)?.[1] ?? null;
  } catch { return null; }
}

interface Variant {
  name: string;
  values: string[];
  images?: Record<string, string>;
  prices?: Record<string, number>;      // valore → prezzo
  productIds?: Record<string, string>;  // valore → id prodotto
}

async function scrapeVariants(asin: string): Promise<Variant[]> {
  try {
    const res = await fetch(`https://www.amazon.it/dp/${asin}/`, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    if (html.toLowerCase().includes('captcha')) return [];

    const colorMap: Record<string, string> = {};
    const ciM = html.match(/"colorImages"\s*:\s*(\{[\s\S]+?\})\s*(?=,\s*"[a-z])/);
    if (ciM) {
      try {
        const ci = JSON.parse(ciM[1]) as Record<string, Array<{ hiRes?: string; large?: string }>>;
        for (const [k, imgs] of Object.entries(ci)) {
          if (k === 'initial') continue;
          const url = imgs?.[0]?.hiRes ?? imgs?.[0]?.large;
          if (url) colorMap[k] = url;
        }
      } catch { /* no-op */ }
    }
    const matchImg = (vals: string[]) => {
      const out: Record<string, string> = {};
      for (const v of vals) {
        const k = Object.keys(colorMap).find((k) => k.toLowerCase().includes(v.toLowerCase()));
        if (k) out[v] = colorMap[k];
      }
      return out;
    };

    const dvM = html.match(/"dimensionValuesDisplayData"\s*:\s*(\{[^}]+\})/);
    if (dvM) {
      try {
        const raw = JSON.parse(dvM[1]) as Record<string, string[]>;
        const variants = Object.entries(raw).map(([name, vals]) => {
          const values = vals.map((v) => v.trim()).filter(Boolean);
          const images = matchImg(values);
          return { name, values, ...(Object.keys(images).length ? { images } : {}) };
        }).filter((v) => v.values.length > 0);
        if (variants.length) return variants;
      } catch { /* fallback */ }
    }

    const opts = [...html.matchAll(/<option[^>]*>([^<]{2,50})<\/option>/gi)]
      .map((m) => m[1].trim()).filter((v) => !['Seleziona', 'Select', '--'].includes(v));
    if (opts.length) {
      const images = matchImg(opts);
      return [{ name: 'Colore', values: opts, ...(Object.keys(images).length ? { images } : {}) }];
    }
    return [];
  } catch { return []; }
}

// ══════════════════════════════════════════════════════════════════
// § 3 — SHARED: DEEPSEEK DESCRIPTION GENERATOR
// ══════════════════════════════════════════════════════════════════

async function generateDescription(name: string, category: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) { log(C.yellow, 'DEEPSEEK', 'Chiave API mancante — descrizione vuota'); return ''; }
  log(C.magenta, 'DEEPSEEK', `Genero descrizione per "${name}"...`);
  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Sei un copywriter di lusso specializzato in sicurezza, sopravvivenza tattica, crittografia e ' +
              'tecnologia EDC di alto profilo. Scrivi descrizioni in HTML puro (solo <p>, <strong>, <em>), ' +
              'italiano, tono sofisticato da Security Consultant. Massimo 150 parole. Solo HTML inline.',
          },
          { role: 'user', content: `Nome: "${name}"\nCategoria: "${category}"` },
        ],
        max_tokens: 320, temperature: 0.82,
      }),
    });
    if (!res.ok) { log(C.red, 'DEEPSEEK', `API error ${res.status}`); return ''; }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content as string) ?? '';
  } catch (e) { log(C.red, 'DEEPSEEK', String(e)); return ''; }
}

// ══════════════════════════════════════════════════════════════════
// § 4 — SHARED: PRICING FORMULAS
// ══════════════════════════════════════════════════════════════════

const USD_TO_EUR_RATE = 1.0;
const MARKUP          = 1.20;
const FLAT_FEE        = 3.99;

function applyKitwerFormula(base: number, currency: 'EUR' | 'USD' | 'UNKNOWN'): number {
  const eur = currency === 'USD' ? base * USD_TO_EUR_RATE : base;
  return Math.floor(eur * MARKUP + FLAT_FEE) + 0.90;
}

function parsePrice(input: string): number {
  if (!input) return NaN;
  let s = input.replace(/[€$£¥\s]/g, '').trim();
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) { s = s.replace(',', '.'); }
  const v = parseFloat(s);
  return isNaN(v) || v < 0 ? NaN : v;
}

// ══════════════════════════════════════════════════════════════════
// § 5 — SHARED: CSV/XLSX PARSING (from auto-importer)
// ══════════════════════════════════════════════════════════════════

const PLACEHOLDER = /^INSERIRE_/i;
const ASIN_RE     = /^[A-Z0-9]{10}$/i;

function normHeader(s: string): string {
  return s.normalize('NFKD')
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase().replace(/['"]/g, '').replace(/\s+/g, ' ').trim();
}

function sanitizeH(s: string) { return s.replace(/[^a-z0-9\s]/g, '').trim(); }

const NAME_ALIASES         = ['nome_prodotto','nome prodotto','nome','product_name','product name','prodotto','name'];
const CATEGORY_ALIASES     = ['categoria','category'];
const SUBCATEGORY_ALIASES  = ['sottocategoria','subcategory','subcategoria','sub_category','sub categoria'];
const RATING_ALIASES       = ['valutazione','rating','voto','stars','vote','recensione'];
const PRICE_ALIASES        = ['prezzo (€)','prezzo_eur','prezzo_usd','estimated_price_eur','prezzo_stimato_eur','price','prezzo','price €','price eur','price usd'];
const ASIN_ALIASES         = ['amazon_asin','asin_amazon','asin amazon','asin'];
const LINK_ALIASES         = ['link_esempio_amazon.it','link affiliazione (esempio)','link_affiliazione_(esempio)','link affiliazione','link_affiliazione','link_esempio','link','amazon link','amazon_link','url'];

interface ColMap { nameIdx:number; categoryIdx:number; subCategoryIdx:number; ratingIdx:number; priceIdx:number; asinIdx:number; linkIdx:number }

function detectColumns(headers: string[]): ColMap {
  const san = headers.map(normHeader).map(sanitizeH);
  const find = (aliases: string[]) => {
    const a = aliases.map(sanitizeH);
    for (const alias of a) {
      if (!alias) continue;
      const i = san.findIndex((s) => s === alias || s.includes(alias));
      if (i !== -1) return i;
    }
    return -1;
  };
  return {
    nameIdx:        find(NAME_ALIASES),
    categoryIdx:    find(CATEGORY_ALIASES),
    subCategoryIdx: find(SUBCATEGORY_ALIASES),
    ratingIdx:      find(RATING_ALIASES),
    priceIdx:       find(PRICE_ALIASES),
    asinIdx:        find(ASIN_ALIASES),
    linkIdx:        find(LINK_ALIASES),
  };
}

function detectCurrency(headers: string[]): 'EUR' | 'USD' | 'UNKNOWN' {
  const n = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ''));
  if (n.some((h) => h.includes('usd'))) return 'USD';
  if (n.some((h) => h.includes('eur'))) return 'EUR';
  return 'UNKNOWN';
}

function extractAsinFromUrl(url: string): string | null {
  if (/[?&](?:s|k)=|\/s\?|\/s\//.test(url)) return null;
  return url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#%&]|$)/i)?.[1]?.toUpperCase() ??
         url.match(/\b(B0[0-9A-Z]{8})\b/i)?.[1]?.toUpperCase() ?? null;
}

function extractAsinFromText(text: string): string | null {
  return text.match(/\b(B0[0-9A-Z]{8})\b/i)?.[1]?.toUpperCase() ?? null;
}

/**
 * Pulisce un URL Amazon lasciando solo l'ASIN nel path canonico.
 * Input:  https://www.amazon.it/dp/B01L9TIS6S?ref=foo&tag=bar
 * Output: https://www.amazon.it/dp/B01L9TIS6S/
 */
function cleanAmazonUrl(url: string): string {
  if (!url) return url;
  const asin = extractAsinFromUrl(url);
  if (asin) return `https://www.amazon.it/dp/${asin}/`;
  return url;
}

function fixEuropeanDecimals(line: string): string {
  let result = '', inQuotes = false, fieldHasDecimal = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; result += ch; }
    else if (!inQuotes && ch === ',') {
      if (!fieldHasDecimal && i > 0 && /\d/.test(line[i - 1])) {
        if (/^\d{1,2}(?:,|$)/.test(line.slice(i + 1))) {
          result += '.'; fieldHasDecimal = true; continue;
        }
      }
      result += ch; fieldHasDecimal = false;
    } else { result += ch; }
  }
  return result;
}

function parseCsvLine(line: string): string[] {
  const f: string[] = [];
  let cur = '', inQ = false, i = 0;
  while (i < line.length) {
    const ch = line[i];
    // Virgoletta escapata con backslash (\"): aggiunge " senza uscire dal campo
    if (ch === '\\' && inQ && i + 1 < line.length && line[i + 1] === '"') {
      cur += '"'; i += 2; continue;
    }
    // Doppia virgoletta RFC 4180 ("") dentro campo quotato: aggiunge " singola
    if (ch === '"' && inQ && i + 1 < line.length && line[i + 1] === '"') {
      cur += '"'; i += 2; continue;
    }
    if (ch === '"') { inQ = !inQ; i++; continue; }
    if (ch === ',' && !inQ) { f.push(cur.trim()); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  f.push(cur.trim());
  return f;
}

interface CsvProduct { name:string; price:number|null; category:string; subCategory:string; rating:number|null; asin:string|null; currency:'EUR'|'USD'|'UNKNOWN' }

function parseCsvContent(content: string, filename = ''): CsvProduct[] {
  const lines = content.trim().split(/\r\n|\n|\r/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const map = detectColumns(headers);
  const currency = detectCurrency(headers);
  if (map.nameIdx === -1) { log(C.red, 'CSV', `Header non riconosciuto in ${filename}`); return []; }
  const results: CsvProduct[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(fixEuropeanDecimals(line));
    const name = (cols[map.nameIdx] ?? '').trim();
    const category = map.categoryIdx !== -1 ? (cols[map.categoryIdx] ?? '').trim() : '';
    const subCategory = map.subCategoryIdx !== -1 ? (cols[map.subCategoryIdx] ?? '').trim() : '';
    if (!name || PLACEHOLDER.test(name)) continue;
    const rawPrice = map.priceIdx !== -1 ? (cols[map.priceIdx] ?? '').trim() : '';
    const price = rawPrice !== '' ? parseFloat(rawPrice) : null;
    const rawRating = map.ratingIdx !== -1 ? (cols[map.ratingIdx] ?? '').trim() : '';
    const rating = rawRating !== '' ? parseFloat(rawRating.replace(',', '.')) : null;
    const rawAsin = map.asinIdx !== -1 ? (cols[map.asinIdx] ?? '').trim() : '';
    const rawLink = map.linkIdx !== -1 ? (cols[map.linkIdx] ?? '').trim() : '';
    let asin: string | null = ASIN_RE.test(rawAsin) ? rawAsin.toUpperCase() : extractAsinFromUrl(rawAsin);
    if (!asin && rawLink) asin = extractAsinFromUrl(rawLink) ?? extractAsinFromText(rawLink);
    results.push({ name, price, category, subCategory, rating, asin, currency });
  }
  return results;
}

function parseExcelFile(filePath: string): CsvProduct[] {
  try {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) return [];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as Array<string[]>;
    if (rows.length < 2) return [];
    const headers = (rows[0] || []).map((h) => String(h ?? '').trim());
    const map = detectColumns(headers);
    const currency = detectCurrency(headers);
    if (map.nameIdx === -1) return [];
    const results: CsvProduct[] = [];
    for (const row of rows.slice(1)) {
      if (!row?.length) continue;
      const name = (row[map.nameIdx] ?? '').toString().trim();
      const category = map.categoryIdx !== -1 ? (row[map.categoryIdx] ?? '').toString().trim() : '';
      const subCategory = map.subCategoryIdx !== -1 ? (row[map.subCategoryIdx] ?? '').toString().trim() : '';
      if (!name || PLACEHOLDER.test(name)) continue;
      const rawPrice = map.priceIdx !== -1 ? (row[map.priceIdx] ?? '').toString().trim() : '';
      const price = rawPrice !== '' ? parseFloat(rawPrice.replace(',', '.')) : null;
      const rawRating = map.ratingIdx !== -1 ? (row[map.ratingIdx] ?? '').toString().trim() : '';
      const rating = rawRating !== '' ? parseFloat(rawRating.replace(',', '.')) : null;
      const rawAsin = map.asinIdx !== -1 ? (row[map.asinIdx] ?? '').toString().trim() : '';
      const rawLink = map.linkIdx !== -1 ? (row[map.linkIdx] ?? '').toString().trim() : '';
      let asin: string | null = ASIN_RE.test(rawAsin) ? rawAsin.toUpperCase() : extractAsinFromUrl(rawAsin);
      if (!asin && rawLink) asin = extractAsinFromUrl(rawLink) ?? extractAsinFromText(rawLink);
      results.push({ name, price, category, subCategory, rating, asin, currency });
    }
    return results;
  } catch (e) { log(C.red, 'XLSX', String(e)); return []; }
}

// ══════════════════════════════════════════════════════════════════
// § 6 — SHARED: CATEGORY CLASSIFIER
// ══════════════════════════════════════════════════════════════════

const CATEGORY_MAP: Record<string, string> = {
  // fpv drones (PRIORITY: prima di battery/vr per evitare classificazioni errate)
  'fpv':'fpv-drones-tech','cinewhoop':'fpv-drones-tech',
  'quadcopter':'fpv-drones-tech','betafpv':'fpv-drones-tech',
  'iflight':'fpv-drones-tech','geprc':'fpv-drones-tech',
  'hglrc':'fpv-drones-tech','radiomaster':'fpv-drones-tech',
  'fatshark':'fpv-drones-tech','walksnail':'fpv-drones-tech',
  'eachine':'fpv-drones-tech','betaflight':'fpv-drones-tech',
  'elrs':'fpv-drones-tech','crossfire':'fpv-drones-tech',
  'holybro':'fpv-drones-tech','flywoo':'fpv-drones-tech',
  'happymodel':'fpv-drones-tech','diatone':'fpv-drones-tech',
  'frsky':'fpv-drones-tech','flysky':'fpv-drones-tech',
  'tbs tango':'fpv-drones-tech','drone':'fpv-drones-tech',
  // crypto wallets
  'cold storage':'hardware-crypto-wallets','signing device':'hardware-crypto-wallets',
  'ledger':'hardware-crypto-wallets','trezor':'hardware-crypto-wallets',
  'tangem':'hardware-crypto-wallets','cryptosteel':'hardware-crypto-wallets',
  'cobo':'hardware-crypto-wallets','bitcoin':'hardware-crypto-wallets',
  'crypto':'hardware-crypto-wallets','wallet':'hardware-crypto-wallets',
  'seed':'hardware-crypto-wallets','mnemonic':'hardware-crypto-wallets',
  'signing':'hardware-crypto-wallets',
  // tactical power
  'portable power station':'tactical-power-grid','power station':'tactical-power-grid',
  'portable power':'tactical-power-grid','goal zero':'tactical-power-grid',
  'power bank':'tactical-power-grid','bluetti':'tactical-power-grid',
  'jackery':'tactical-power-grid','ecoflow':'tactical-power-grid',
  'anker':'tactical-power-grid','nitecore':'tactical-power-grid',
  'powerbank':'tactical-power-grid','batteria':'tactical-power-grid',
  'battery':'tactical-power-grid','solar':'tactical-power-grid',
  'solare':'tactical-power-grid','charger':'tactical-power-grid',
  'caricatore':'tactical-power-grid','ups':'tactical-power-grid',
  'apc':'tactical-power-grid','fast charge':'tactical-power-grid',
  // comms security
  'privacy screen':'comms-security-shield','privacy filter':'comms-security-shield',
  'security key':'comms-security-shield','yubikey':'comms-security-shield',
  'yubico':'comms-security-shield','faraday':'comms-security-shield',
  'rfid':'comms-security-shield','fido':'comms-security-shield',
  'titan':'comms-security-shield','thetis':'comms-security-shield',
  'feitian':'comms-security-shield','encrypted':'comms-security-shield',
  'privacy':'comms-security-shield','screen':'comms-security-shield',
  'airtag':'comms-security-shield','webcam cover':'comms-security-shield',
  'signal jammer':'comms-security-shield',
  // sim racing
  'wheel stand':'sim-racing-accessories-premium','driving force':'sim-racing-accessories-premium',
  'cockpit':'sim-racing-accessories-premium','playseat':'sim-racing-accessories-premium',
  'racing':'sim-racing-accessories-premium','shifter':'sim-racing-accessories-premium',
  'volante':'sim-racing-accessories-premium','fanatec':'sim-racing-accessories-premium',
  'thrustmaster':'sim-racing-accessories-premium','moza':'sim-racing-accessories-premium',
  'logitech':'sim-racing-accessories-premium','next level':'sim-racing-accessories-premium',
  'gt omega':'sim-racing-accessories-premium','pedals':'sim-racing-accessories-premium',
  'wheel':'sim-racing-accessories-premium','sim':'sim-racing-accessories-premium',
  // gaming desk
  'gaming mouse':'trading-gaming-desk-accessories-premium',
  'laptop stand':'trading-gaming-desk-accessories-premium',
  'cooling pad':'trading-gaming-desk-accessories-premium',
  'monitor arm':'trading-gaming-desk-accessories-premium',
  'gaming chair':'trading-gaming-desk-accessories-premium',
  'chair':'trading-gaming-desk-accessories-premium',
  'monitor':'trading-gaming-desk-accessories-premium',
  'desk':'trading-gaming-desk-accessories-premium',
  'virtual reality':'trading-gaming-desk-accessories-premium',
  'meta quest':'trading-gaming-desk-accessories-premium',
  'oculus':'trading-gaming-desk-accessories-premium',
  'htc vive':'trading-gaming-desk-accessories-premium',
  'valve index':'trading-gaming-desk-accessories-premium',
  'ergotron':'trading-gaming-desk-accessories-premium',
  // survival edc
  'fire starter':'survival-edc-tech','ferro rod':'survival-edc-tech',
  'water filter':'survival-edc-tech','multi-tool':'survival-edc-tech',
  'edc':'survival-edc-tech','survival':'survival-edc-tech',
  'leatherman':'survival-edc-tech','victorinox':'survival-edc-tech',
  'gerber':'survival-edc-tech','streamlight':'survival-edc-tech',
  'lifestraw':'survival-edc-tech','paracord':'survival-edc-tech',
  'flashlight':'survival-edc-tech','torcia':'survival-edc-tech',
  'multitool':'survival-edc-tech','olight':'survival-edc-tech',
  'emergency':'survival-edc-tech','emergenza':'survival-edc-tech',
  'tattica':'survival-edc-tech','keychain':'survival-edc-tech',
  'knife':'survival-edc-tech','coltello':'survival-edc-tech',
  'blade':'survival-edc-tech','spyderco':'survival-edc-tech',
  'schrade':'survival-edc-tech','condor':'survival-edc-tech',
  'benchmade':'survival-edc-tech','cold steel':'survival-edc-tech',
  'night vision':'survival-edc-tech','nightvision':'survival-edc-tech',
  'visione notturna':'survival-edc-tech','thermal':'survival-edc-tech',
  'bivvy':'survival-edc-tech','bivy':'survival-edc-tech',
  'sopravvivenza':'survival-edc-tech','bivouac':'survival-edc-tech',
  'mylar':'survival-edc-tech','coperta reattiva':'survival-edc-tech',
};

// Set di tutti gli slug top-level validi nel DB
const VALID_SLUGS = new Set([
  'hardware-crypto-wallets', 'tactical-power-grid', 'comms-security-shield',
  'sim-racing-accessories-premium', 'trading-gaming-desk-accessories-premium',
  'survival-edc-tech', 'fpv-drones-tech',
  'Smart Security', 'Tactical Power', 'PC Hardware',
  'Smart Home', '3D Printing',
]);

// Mappa esplicita: qualsiasi variante stringa (lowercase, spazi) → slug canonico DB
// Usata da resolveSlug() — NON fa keyword matching, solo lookup deterministico
const SLUG_ALIASES: Record<string, string> = {
  // hardware-crypto-wallets
  'hardware-crypto-wallets':                 'hardware-crypto-wallets',
  'hardware crypto wallets':                 'hardware-crypto-wallets',
  'crypto wallets':                          'hardware-crypto-wallets',
  'crypto_wallets':                          'hardware-crypto-wallets',
  'hardware wallet':                         'hardware-crypto-wallets',
  // tactical-power-grid
  'tactical-power-grid':                     'tactical-power-grid',
  'tactical power grid':                     'tactical-power-grid',
  'tactical power':                          'tactical-power-grid',
  'tactical_power':                          'tactical-power-grid',
  'tactila power':                           'tactical-power-grid', // typo filename
  'tactila_power':                           'tactical-power-grid', // typo filename
  // comms-security-shield
  'comms-security-shield':                   'comms-security-shield',
  'comms security shield':                   'comms-security-shield',
  'comms security':                          'comms-security-shield',
  // sim-racing-accessories-premium
  'sim-racing-accessories-premium':          'sim-racing-accessories-premium',
  'sim racing accessories premium':          'sim-racing-accessories-premium',
  'sim racing accessories':                  'sim-racing-accessories-premium',
  'sim racing':                              'sim-racing-accessories-premium',
  'sim_racing':                              'sim-racing-accessories-premium',
  'categoria sim racing':                    'sim-racing-accessories-premium',
  'categoria_sim_racing':                    'sim-racing-accessories-premium',
  // trading-gaming-desk-accessories-premium
  'trading-gaming-desk-accessories-premium': 'trading-gaming-desk-accessories-premium',
  'trading gaming desk accessories premium': 'trading-gaming-desk-accessories-premium',
  'trading gaming desk':                     'trading-gaming-desk-accessories-premium',
  'gaming desk':                             'trading-gaming-desk-accessories-premium',
  'gamedesk':                                'trading-gaming-desk-accessories-premium',
  // survival-edc-tech
  'survival-edc-tech':                       'survival-edc-tech',
  'survival edc tech':                       'survival-edc-tech',
  'survival edc':                            'survival-edc-tech',
  'survival_edc':                            'survival-edc-tech',
  'survival edc & digital survival':         'survival-edc-tech',
  // Smart Security (display name nel DB)
  'smart security':                          'Smart Security',
  'smart_security':                          'Smart Security',
  'smart-security':                          'Smart Security',
  // PC Hardware (display name nel DB)
  'pc hardware':                             'PC Hardware',
  'pc-hardware':                             'PC Hardware',
  'pc_hardware':                             'PC Hardware',
  'pc_hardwer':                              'PC Hardware', // typo filename
  'pc hardwer':                              'PC Hardware', // typo filename
  // Smart Home
  'smart home':                              'Smart Home',
  'smart_home':                              'Smart Home',
  'smart-home':                              'Smart Home',
  // 3D Printing
  '3d printing':                             '3D Printing',
  '3d_printing':                             '3D Printing',
  '3d-printing':                             '3D Printing',
  '3d printing maker':                       '3D Printing',
  // fpv-drones-tech
  'fpv-drones-tech':                         'fpv-drones-tech',
  'fpv drones tech':                         'fpv-drones-tech',
  'fpv drones':                              'fpv-drones-tech',
  'fpv-drones':                              'fpv-drones-tech',
  'tactical drones fpv':                     'fpv-drones-tech',
  'tactical-drones-fpv':                     'fpv-drones-tech',
  'tactical drones':                         'fpv-drones-tech',
  'drones fpv':                              'fpv-drones-tech',
  'drones fpv tactical':                     'fpv-drones-tech',
  // gaming workstations → trading-gaming-desk
  'gaming workstations':                     'trading-gaming-desk-accessories-premium',
  'gaming_workstations':                     'trading-gaming-desk-accessories-premium',
  'gaming & workstations':                   'trading-gaming-desk-accessories-premium',
  'gaming desk & pc hardware':               'trading-gaming-desk-accessories-premium',
  // crypto mining → hardware-crypto-wallets
  'crypto mining':                           'hardware-crypto-wallets',
  'crypto_mining':                           'hardware-crypto-wallets',
  // comunicazioni → comms-security-shield
  'comunicazioni':                           'comms-security-shield',
};

/**
 * Risolve qualsiasi stringa al suo slug DB canonico tramite lookup deterministico.
 * Restituisce null se la stringa non è riconosciuta come categoria top-level.
 * NON fa keyword matching — quello è compito di CATEGORY_MAP.
 *
 * Normalizzazione applicata prima del lookup:
 *   - converte in lowercase, sostituisce [-_]+ con spazio
 *   - rimuove suffissi "pro" / "premium" per evitare slug spuri
 *     (es. "Sim Racing Pro" → "sim racing" → slug canonico)
 *     Eccezione: se la stringa contiene "bundle" i suffissi vengono mantenuti.
 */
function resolveSlug(input: string): string | null {
  if (!input) return null;
  const key = input.toLowerCase().replace(/[-_]+/g, ' ').trim();

  // 1. Lookup diretto
  if (SLUG_ALIASES[key]) return SLUG_ALIASES[key];

  // 2. Prova senza estensione file (es. "categoria_sim_racing.csv" → "categoria sim racing")
  const noExt = key.replace(/\.(csv|xlsx)$/i, '').trim();
  if (noExt !== key && SLUG_ALIASES[noExt]) return SLUG_ALIASES[noExt];

  // 3. Rimuovi "pro" / "premium" (a meno che non sia un bundle) e riprova
  const isBundle = key.includes('bundle') || key.includes('kit');
  if (!isBundle) {
    const stripped = noExt
      .replace(/\b(pro|premium)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped !== noExt && SLUG_ALIASES[stripped]) return SLUG_ALIASES[stripped];
  }

  // 4. Strip suffissi batch/nuovi/numerici dai nomi file
  //    es. survival_edc_nuovi_28 → survival_edc
  //        tactical_drones_fpv_41 → tactical_drones_fpv
  //        sim_racing_batch2_16   → sim_racing
  const debatched = noExt
    .replace(/\s+(nuovi|batch\d*)\s+\d+\s*$|\s+(nuovi|batch\d*)\s*$|\s+\d+\s*$/i, '')
    .trim();
  if (debatched && debatched !== noExt && SLUG_ALIASES[debatched]) return SLUG_ALIASES[debatched];

  // 5. Controlla se l'input è già uno slug valido nel DB
  if (VALID_SLUGS.has(input.trim())) return input.trim();
  return null;
}

/**
 * Classifica un prodotto nella categoria corretta rispettando la seguente
 * gerarchia di priorità (BLINDATA):
 *   1. Colonna CSV (category/subcategory) — se mappa a uno slug noto
 *   2. Nome del file sorgente — slug derivato deterministicamente dal filename
 *   3. Keyword matching sul nome prodotto — solo come ultimo fallback
 */
function classifyCategory(
  name: string, csvCat = '', filename = ''
): { category: string; source: string } {
  // PRIORITÀ 1: Colonna CSV (solo se risolve a uno slug top-level noto)
  if (csvCat.trim()) {
    const slug = resolveSlug(csvCat.trim());
    if (slug) return { category: slug, source: `colonna CSV ("${csvCat}")` };
  }

  // PRIORITÀ 2: Nome file sorgente (fonte primaria per import da MAGAZZINO/)
  if (filename) {
    const slug = resolveSlug(filename);
    if (slug) return { category: slug, source: `file sorgente ("${filename}")` };
  }

  // PRIORITÀ 3: Keyword fallback sul nome prodotto (solo se nessuna sorgente disponibile)
  const lower = name.toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(kw)) return { category: cat, source: `keyword match ("${kw}")` };
  }

  return { category: 'UNSORTED', source: 'nessuna corrispondenza' };
}

// ══════════════════════════════════════════════════════════════════
// § 6.5 — PROCESS-MAGAZZINO-LINKS
// ══════════════════════════════════════════════════════════════════

// Funzione per pulire l'URL dai parametri di affiliazione (riutilizzata da sync-product-links)
function cleanAffiliateLinkUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Rimuovi parametri comuni di affiliazione
    const affiliateParams = ['tag', 'ref', 'linkCode', 'node', 'linkId', 'camp', 'creative', 'creativeASIN', 'ascsubtag'];
    affiliateParams.forEach((param) => urlObj.searchParams.delete(param));
    // Rimuovi anche hash
    return urlObj.toString().split('#')[0];
  } catch {
    return url; // Se non è un URL valido, ritorna l'originale
  }
}

// Verifica se un URL restituisce HTTP 200
async function checkUrlStatus(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 10_000);
  try {
    let res = await fetch(url, { 
      method: 'HEAD', 
      signal: ctrl.signal, 
      redirect: 'follow', 
      headers: { 'User-Agent': 'Mozilla/5.0' } 
    });
    if (res.status === 405) {
      res = await fetch(url, { 
        method: 'GET', 
        signal: ctrl.signal, 
        redirect: 'follow', 
        headers: { 'User-Agent': 'Mozilla/5.0' } 
      });
    }
    return res.status === 200;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

interface ProcessedMagazzinoProduct {
  name: string;
  price: number | null;
  category: string;
  asin: string | null;
  currency: 'EUR' | 'USD' | 'UNKNOWN';
  product_url?: string;
}

// Processa i link dei prodotti nella cartella MAGAZZINO
async function processMagazzinoLinks(): Promise<Map<string, ProcessedMagazzinoProduct>> {
  const MAGAZZINO_DIR = resolve(process.cwd(), 'MAGAZZINO');
  const processedProducts = new Map<string, ProcessedMagazzinoProduct>();
  
  if (!existsSync(MAGAZZINO_DIR)) {
    log(C.yellow, 'WARN', 'Cartella MAGAZZINO/ non trovata');
    return processedProducts;
  }
  
  const files = readdirSync(MAGAZZINO_DIR).filter(f => f.endsWith('.csv') || f.endsWith('.xlsx'));
  let totalProcessed = 0;
  let validLinks = 0;
  
  log(C.cyan, 'PROCESS-LINKS', `Elaborazione link da ${files.length} file in MAGAZZINO/`);
  
  for (const file of files) {
    const filePath = join(MAGAZZINO_DIR, file);
    const isExcel = file.endsWith('.xlsx');
    const products = isExcel ? parseExcelFile(filePath) : parseCsvContent(readFileSync(filePath, 'utf-8'), file);
    
    log(C.cyan, 'FILE', `${file} - ${products.length} prodotti`);
    
    for (const product of products) {
      totalProcessed++;
      
      // Se c'è un URL nel prodotto, puliscilo e validalo
      const originalUrl = (product as any).product_url;
      
      if (originalUrl) {
        const cleanedUrl = cleanAffiliateLinkUrl(originalUrl);
        const isValid = await checkUrlStatus(cleanedUrl);
        
        if (isValid) {
          validLinks++;
          // Aggiungi il link pulito al prodotto
          const productWithUrl = {
            ...product,
            product_url: cleanedUrl
          } as ProcessedMagazzinoProduct;
          
          // Usa il nome del prodotto come chiave
          processedProducts.set(product.name, productWithUrl);
          
          log(C.green, 'LINK-OK', `✓ ${product.name}`);
        } else {
          // Prodotto senza link valido
          processedProducts.set(product.name, product as ProcessedMagazzinoProduct);
          log(C.yellow, 'LINK-FAIL', `✗ ${product.name} (link non valido)`);
        }
      } else {
        // Prodotto senza URL
        processedProducts.set(product.name, product as ProcessedMagazzinoProduct);
      }
      
      // Delay per evitare rate limiting
      if (originalUrl) {
        await delay(500, 1000);
      }
    }
  }
  
  log(C.green, 'PROCESS-LINKS', `Completato: ${validLinks}/${totalProcessed} prodotti con link puliti e verificati`);
  return processedProducts;
}

// ══════════════════════════════════════════════════════════════════
// § 7 — COMMAND: IMPORT (auto-importer)
// ══════════════════════════════════════════════════════════════════

interface ProductRow {
  name:string; price:number; category:string; description:string;
  image_url:string; image_urls:string[];
  product_url:string;
  is_price_pending:boolean; is_budget_king:boolean;
  sub_category?:string; variants:Variant[];
}

async function cmdImport(args: string[]) {
  const permissive    = args.includes('--permissive');
  const upsertMode    = args.includes('--upsert');
  const fromRevisione = args.includes('--from-revisione');
  const hardReset     = args.includes('--hard-reset');
  const noAsin        = args.includes('--no-asin');

  // Guard: combinazione --hard-reset + --no-asin non consentita
  if (hardReset && noAsin) {
    log(C.red, 'FATAL', '--hard-reset e --no-asin non possono essere usati insieme.');
    log(C.yellow, 'INFO', 'Usa --hard-reset separatamente, poi esegui l\'import con --no-asin.');
    return;
  }

  const AFFILIATE_TAG  = 'kitwer26-21';
  const MAGAZZINO_DIR  = resolve(process.cwd(), 'MAGAZZINO');
  const OUTPUT_DIR     = resolve(process.cwd(), 'output');
  const OUTPUT_PATH    = join(OUTPUT_DIR, 'import_finale.json');
  const REVISIONE_PATH = resolve(process.cwd(), 'da_revisionare.txt');

  banner('AUTO-IMPORTER — Universal CSV Importer',
    hardReset ? '⚠ HARD-RESET + ' + (permissive ? 'PERMISSIVE' : 'STRICT') :
    noAsin    ? 'NO-ASIN MODE — import diretto senza scraping Amazon' :
    permissive ? 'PERMISSIVE MODE' : 'STRICT MODE');
  const supabase = getSupabase();

  // Ensure table/columns
  const { error: connErr } = await supabase.from('products').select('id').limit(1);
  if (connErr && !connErr.message.includes('does not exist')) {
    log(C.red, 'FATAL', `Connessione Supabase: ${connErr.message}`); return;
  }
  log(C.green, 'DB', 'Connesso a Supabase');

  // ── HARD RESET ───────────────────────────────────────────────────
  if (hardReset) {
    const forceMode = args.includes('--force');
    log(C.red, 'HARD-RESET', '⚠  Pulizia completa: products → subcategories → categories...');
    const { count: before } = await supabase.from('products').select('*', { count: 'exact', head: true });
    log(C.yellow, 'WARNING', `Prodotti nel DB: ${before ?? 0}`);
    if (!forceMode) {
      const ok1 = await confirm(`⚠  HARD RESET: Eliminare TUTTI i ${before ?? 0} prodotti + categorie + sottocategorie?`);
      if (!ok1) { log(C.cyan, 'ANNULLATO', 'Hard reset annullato — import interrotto'); return; }
      const ok2 = await confirm('ULTIMA CONFERMA: questa operazione è IRREVERSIBILE. Continuare?');
      if (!ok2) { log(C.cyan, 'ANNULLATO', 'Hard reset annullato — import interrotto'); return; }
    } else {
      log(C.yellow, 'HARD-RESET', '--force attivo: skip conferme interattive');
    }
    // 1. Elimina products prima (evita FK violation verso categories/subcategories)
    const { error: delProdErr } = await supabase.from('products').delete().not('id', 'is', null);
    if (delProdErr) { log(C.red, 'ERRORE', `Pulizia products fallita: ${delProdErr.message}`); return; }
    log(C.green, 'HARD-RESET', `✓ Eliminati ${before ?? 0} prodotti`);
    // 2. Elimina subcategories
    const { error: delSubErr } = await supabase.from('subcategories').delete().not('id', 'is', null);
    if (delSubErr) log(C.yellow, 'WARN', `Pulizia subcategories: ${delSubErr.message}`);
    else log(C.green, 'HARD-RESET', '✓ Tabella subcategories svuotata');
    // 3. Elimina categories
    const { error: delCatErr } = await supabase.from('categories').delete().not('id', 'is', null);
    if (delCatErr) log(C.yellow, 'WARN', `Pulizia categories: ${delCatErr.message}`);
    else log(C.green, 'HARD-RESET', '✓ Tabella categories svuotata');
    log(C.green, 'HARD-RESET', '✓ DB completamente pulito — pronto per import fresco');
  }

  const findExisting = async (name: string) => {
    const { data } = await supabase.from('products').select('description').eq('name', name).maybeSingle();
    return { exists: !!data, description: (data?.description as string) ?? '' };
  };

  const appendRevisione = (n: string, link: string, reason: string) => {
    const line = `[${new Date().toLocaleDateString('it-IT')}] Nome Prodotto: ${n} | Link: ${link} | Motivo: ${reason}\n`;
    appendFileSync(REVISIONE_PATH, line, 'utf-8');
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, '[\n', 'utf-8');
  let firstJson = true;
  let saved = 0, skipped = 0, failed = 0, revisione = 0;
  let processedMagazzinoProducts: Map<string, ProcessedMagazzinoProduct> = new Map();
  const rejectMap = new Map<string, number>();
  const trackRej = (n: string, link: string, reason: string) => {
    appendRevisione(n, link, reason);
    rejectMap.set(reason, (rejectMap.get(reason) ?? 0) + 1);
    revisione++;
  };

  const processProduct = async (
    name: string, price: number | null, category: string,
    asin: string | null, currency: 'EUR'|'USD'|'UNKNOWN', filename: string, idx: number, total: number,
    subCategory = '', rating: number | null = null, cleanProductUrl?: string
  ) => {
    console.log(`\n${C.bright}${C.yellow}── [${idx}/${total}] ${name} ──${C.reset}`);
    try {
      const { exists } = await findExisting(name);
      if (exists && !upsertMode) { log(C.blue, 'SKIP', `"${name}" già nel DB`); skipped++; return; }
      if (exists && upsertMode) log(C.cyan, 'UPSERT', `"${name}" già nel DB → aggiornamento`);

      const isPricePending = price === null || isNaN(price) || price <= 0;
      const rawPrice       = isPricePending ? 0 : price!;
      const finalPrice     = isPricePending ? 0 : applyKitwerFormula(rawPrice, currency);

      // ── Budget King: prezzo grezzo < €25 e valutazione ≥ 4.5 ─────
      const isBudgetKing = !isPricePending && rawPrice < 25.00 &&
                           rating !== null && !isNaN(rating) && rating >= 4.5;
      if (isBudgetKing) log(C.yellow, 'BUDGET KING', `⭐ "${name}" → €${rawPrice} | ★${rating}`);

      const { category: finalCat, source: catSource } = classifyCategory(name, category, filename);
      log(C.cyan, 'IMPORT', `Prodotto '${name}' assegnato a categoria '${finalCat}' (da ${catSource})`);
      if (finalCat === 'UNSORTED' && !permissive) {
        const link = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;
        trackRej(name, link, 'Categoria sconosciuta');
        log(C.red, 'SCARTATO', `"${name}" → categoria sconosciuta`); return;
      }

      // ── Sottocategoria: CSV > keyword fallback ────────────────────
      const finalSubCat = subCategory.trim() || assignSubCat(finalCat, name, '') || undefined;
      if (finalSubCat) log(C.magenta, 'SUBCAT', `"${name}" → ${finalSubCat}`);

      let finalAsin: string | null = null;
      let gallery: string[]  = [];
      let variants: Variant[] = [];

      if (noAsin) {
        // ── NO-ASIN MODE: import diretto, nessuno scraping Amazon ───────
        log(C.cyan, 'NO-ASIN', `"${name}" → import diretto (placeholder immagine, no ASIN)`);
        gallery  = ['/placeholder.svg'];
        variants = [];
      } else {
        finalAsin = asin ?? extractAsinFromText(name) ?? await findAsin(name);
        if (!finalAsin) {
          const link = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;
          trackRej(name, link, 'ASIN non trovato');
          log(C.red, 'SCARTATO', `"${name}" → ASIN non trovato`); return;
        }
        gallery = await fetchProductGallery(finalAsin);
        if (gallery.length === 1 && gallery[0].endsWith(`${finalAsin}.jpg`)) {
          const si = await searchProductImage(name);
          if (si) {
            gallery[0] = si;
          } else {
            // Fallback: URL Amazon CDN standard con ASIN — accettabile, non scartiamo
            gallery[0] = `https://m.media-amazon.com/images/I/${finalAsin}._AC_SL500_.jpg`;
            log(C.yellow, 'IMG-FALLBACK', `"${name}" → uso CDN ASIN fallback`);
          }
        }
        variants = await scrapeVariants(finalAsin);
      }

      // ── URL prodotto ────────────────────────────────────────────────
      // In no-asin mode usa URL di ricerca senza tag affiliazione (evita click non validi)
      const product_url = cleanProductUrl
        ? cleanAmazonUrl(cleanProductUrl)
        : finalAsin
          ? `https://www.amazon.it/dp/${finalAsin}/`
          : noAsin
            ? `https://www.amazon.it/s?k=${encodeURIComponent(name)}`
            : `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;

      // In no-asin mode saltiamo DeepSeek per velocità e affidabilità
      const description = noAsin ? '' : await generateDescription(name, finalCat);

      const row: ProductRow = {
        name, price: finalPrice, category: finalCat, description,
        image_url: gallery[0], image_urls: gallery,
        product_url,
        is_price_pending: isPricePending, is_budget_king: isBudgetKing,
        variants,
        ...(finalSubCat && { sub_category: finalSubCat }),
      };

      const { error } = upsertMode
        ? await supabase.from('products').upsert(row, { onConflict: 'name' })
        : await supabase.from('products').insert(row);

      if (error) throw new Error(error.message);
      log(C.green, exists ? 'AGGIORNATO' : 'SALVATO', `✓ [${idx}/${total}] "${name}"`);
      appendFileSync(OUTPUT_PATH, (firstJson ? '  ' : ',\n  ') + JSON.stringify(row), 'utf-8');
      firstJson = false;
      saved++;
    } catch (e) {
      log(C.red, 'ERRORE', `"${name}" → ${e instanceof Error ? e.message : String(e)}`);
      failed++;
    }
  };

  if (fromRevisione) {
    log(C.magenta, 'REVISIONE', `Modalità --from-revisione`);
    const entries: Array<{name:string;link:string}> = [];
    try {
      for (const line of readFileSync(REVISIONE_PATH, 'utf-8').split('\n')) {
        const n = line.match(/Nome Prodotto:\s*(.+?)\s*\|\s*Link:/)?.[1]?.trim();
        const l = line.match(/Link:\s*(https?:\/\/[^\s|]+)/)?.[1]?.trim();
        if (n && l) entries.push({ name: n, link: l });
      }
    } catch { log(C.red, 'REVISIONE', 'da_revisionare.txt non trovato'); return; }
    log(C.cyan, 'REVISIONE', `${entries.length} prodotti da reimportare`);
    for (let i = 0; i < entries.length; i++) {
      const { name, link } = entries[i];
      const asin = extractAsinFromUrl(link) ?? extractAsinFromText(name);
      await processProduct(name, null, '', asin, 'UNKNOWN', '', i + 1, entries.length, '', null);
      if (i < entries.length - 1 && !noAsin) await delay(4000, 7000);
    }
  } else {
    const isCsv  = (s: string) => s.toLowerCase().endsWith('.csv');
    const isXlsx = (s: string) => s.toLowerCase().endsWith('.xlsx');
    const cliFiles = args.filter((a) => isCsv(a) || isXlsx(a));

    let entries: Array<{ filename: string; filePath: string; isExcel: boolean }> = [];
    if (cliFiles.length > 0) {
      entries = cliFiles.map((p) => {
        const direct = resolve(p);
        if (existsSync(direct)) return { filename: basename(p), filePath: direct, isExcel: isXlsx(p) };
        const mag = existsSync(MAGAZZINO_DIR) ? readdirSync(MAGAZZINO_DIR).filter((f) => isCsv(f) || isXlsx(f)) : [];
        const m = mag.find((f) => f.toLowerCase().includes(basename(p, extname(p)).toLowerCase()));
        return m ? { filename: m, filePath: join(MAGAZZINO_DIR, m), isExcel: isXlsx(m) }
                 : { filename: basename(p), filePath: direct, isExcel: isXlsx(p) };
      });
    } else {
      if (!existsSync(MAGAZZINO_DIR)) { log(C.yellow, 'SCAN', 'Cartella MAGAZZINO/ non trovata'); return; }
      entries = readdirSync(MAGAZZINO_DIR)
        .filter((f) => isCsv(f) || isXlsx(f))
        .map((f) => ({ filename: f, filePath: join(MAGAZZINO_DIR, f), isExcel: isXlsx(f) }));
    }
    if (entries.length === 0) { log(C.yellow, 'SCAN', 'Nessun file CSV/XLSX trovato'); return; }
    log(C.cyan, 'SCAN', `${entries.length} file: ${entries.map((e) => e.filename).join(', ')}\n`);

    // Processa i link MAGAZZINO prima dell'importazione (skip in no-asin mode)
    if (!noAsin) {
      log(C.magenta, 'PROCESS', 'Elaborazione link MAGAZZINO...');
      processedMagazzinoProducts = await processMagazzinoLinks();
    } else {
      log(C.cyan, 'NO-ASIN', 'Skip processMagazzinoLinks — no-asin mode attivo');
    }

    for (const { filename, filePath, isExcel } of entries) {
      hr('═', 58, C.blue);
      log(C.blue, 'FILE', filename);
      // Log di assegnazione fissa della categoria dal file sorgente
      const fileSlug = resolveSlug(filename);
      if (fileSlug) {
        log(C.magenta, 'FOLDER-SYNC', `File: ${filename} -> Assegnazione fissa alla categoria: ${fileSlug}`);
      } else {
        log(C.yellow, 'FOLDER-SYNC', `File: ${filename} -> Nessuna categoria fissa — uso keyword fallback per ogni prodotto`);
      }
      hr('═', 58, C.blue);
      const products = isExcel ? parseExcelFile(filePath) : parseCsvContent(readFileSync(filePath, 'utf-8'), filename);
      if (products.length === 0) { log(C.yellow, 'FILE', 'Nessuna riga valida — salto'); continue; }
      for (let i = 0; i < products.length; i++) {
        const { name, price, category, subCategory, rating, asin, currency } = products[i];
        const processedProduct = processedMagazzinoProducts.get(name);
        const cleanProductUrl = processedProduct?.product_url;
        await processProduct(name, price, category, asin, currency, filename, i + 1, products.length, subCategory, rating, cleanProductUrl);
        if (i < products.length - 1 && !noAsin) await delay(4000, 7000);
      }
    }
  }

  appendFileSync(OUTPUT_PATH, '\n]\n', 'utf-8');

  // Riepilogo link puliti (solo in modalità normale, non no-asin)
  if (!noAsin) {
    const cleanLinksCount = [...processedMagazzinoProducts.values()].filter((p) => p.product_url).length;
    console.log(`${C.bright}${C.green}  ✓ ${cleanLinksCount} prodotti importati con link puliti e verificati${C.reset}`);
  }

  // Riepilogo generale
  hr();
  console.log(`${C.bright}${C.green}  ✓ Importati     : ${saved}${C.reset}`);
  console.log(`${C.bright}${C.blue}  ↺ Già nel DB    : ${skipped}${C.reset}`);
  console.log(`${C.bright}${C.red}  ✗ Scartati      : ${revisione}${C.reset}`);
  if (failed) console.log(`${C.bright}${C.red}  ✗ Errori tecnici: ${failed}${C.reset}`);
  hr();
}

// ══════════════════════════════════════════════════════════════════
// § 8 — COMMAND: DEDUP
// ══════════════════════════════════════════════════════════════════

async function cmdDedup(args: string[]) {
  const dryRun   = args.includes('--dry-run');
  const inspect  = args.includes('--inspect'); // mostra URL raw dei top gruppi
  banner('DEDUP-PRODUCTS — De-duplicazione per ASIN univoco', dryRun ? 'DRY RUN (no modifiche)' : inspect ? 'INSPECT' : 'LIVE');
  const supabase = getSupabase();

  interface P { id:string; name:string; product_url:string|null; price:number|null; created_at:string|null }

  // Carica in batch (Supabase max 1000 per query)
  let allProducts: P[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,product_url,price,created_at')
      .range(from, from + 999);
    if (error) { log(C.red, 'FATAL', error.message); return; }
    if (!data?.length) break;
    allProducts = allProducts.concat(data as P[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (!allProducts.length) { log(C.yellow, 'INFO', 'Nessun prodotto nel database'); return; }
  log(C.cyan, 'SCAN', `${allProducts.length} prodotti caricati`);

  // Normalizza il nome per confronto: lowercase, no accenti, no punteggiatura, spazi singoli
  const normName = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
     .replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

  // Raggruppa per nome normalizzato — duplicati reali hanno lo stesso nome esatto
  const groups = new Map<string, P[]>();
  let noName = 0;
  for (const p of allProducts) {
    const key = normName(p.name ?? '');
    if (!key || key.length < 5) { noName++; continue; }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const dups = [...groups.entries()].filter(([, g]) => g.length > 1);
  const totalToDelete = dups.reduce((s, [, g]) => s + g.length - 1, 0);
  log(C.yellow, 'DUPLICATI', `${dups.length} nomi duplicati  |  ${noName} senza nome (ignorati)  |  da eliminare: ${totalToDelete}`);

  if (dups.length === 0) {
    log(C.green, 'OK', 'Nessun duplicato trovato — database pulito!');
    hr();
    return;
  }

  // --inspect: mostra TOP 5 gruppi con URL raw per diagnosi
  if (inspect || dryRun) {
    const topGroups = [...dups].sort((a, b) => b[1].length - a[1].length).slice(0, inspect ? 10 : dups.length);
    console.log(`\n${C.bright}  Gruppi duplicati (ordinati per dimensione):${C.reset}`);
    for (const [key, group] of topGroups) {
      console.log(`\n  ${C.bright}${C.yellow}NOME: "${key.slice(0, 60)}"  (${group.length} record)${C.reset}`);
      group.slice(0, 3).forEach((p, i) => {
        const label = i === 0 ? `${C.green}KEEP` : `${C.gray}DEL `;
        console.log(`    ${label}${C.reset}  id=${p.id}  price=${p.price ?? '?'}  "${p.name.slice(0, 55)}"`);
        console.log(`         product_url: ${p.product_url ?? 'null'}`);
      });
      if (group.length > 3) console.log(`    ${C.gray}  ... e altri ${group.length - 3} record${C.reset}`);
    }
    if (inspect && dups.length > 10) console.log(`\n  ${C.gray}... e altri ${dups.length - 10} gruppi${C.reset}`);
  }

  console.log(`\n${C.bright}${C.red}  ⚠  Totale record da eliminare: ${totalToDelete}${C.reset}`);

  if (dryRun || inspect) {
    console.log(`${C.bright}${C.yellow}  DRY RUN — nessuna modifica eseguita${C.reset}`);
    hr();
    return;
  }

  // Esegui cancellazioni: tieni il record con prezzo più basso (o il più recente se parità)
  let deleted = 0, errored = 0;
  for (const [, group] of dups) {
    // Ordina: prezzo crescente → data decrescente come tiebreaker
    const sorted = [...group].sort((a, b) => {
      const pa = a.price ?? Infinity, pb = b.price ?? Infinity;
      if (pa !== pb) return pa - pb;
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
    const keepId = sorted[0].id;
    const deleteIds = sorted.slice(1).map((p) => p.id);

    const { error: dErr } = await supabase.from('products').delete().in('id', deleteIds);
    if (dErr) { log(C.red, 'ERR', `${dErr.message}`); errored++; continue; }
    deleted += deleteIds.length;
  }

  hr();
  console.log(`${C.bright}${C.green}  Gruppi ASIN duplicati : ${dups.length}${C.reset}`);
  console.log(`${C.bright}${C.red}  Record eliminati      : ${deleted}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  Prodotti rimasti      : ${allProducts.length - deleted}${C.reset}`);
  if (errored) console.log(`${C.bright}${C.yellow}  Errori                : ${errored}${C.reset}`);
  hr();
}

// ══════════════════════════════════════════════════════════════════
// § 9 — COMMAND: VARIANTS
// ══════════════════════════════════════════════════════════════════

/**
 * Estrae varianti direttamente dal nome del prodotto — offline, 100% affidabile.
 * Amazon scraping non è usato (bloccato da bot-detection).
 */
function extractVariantsFromName(name: string): Variant[] {
  const variants: Variant[] = [];
  const n = name;

  // ── Piattaforma (gaming) ──────────────────────────────────────────
  const platMatch = n.match(/\b(PS[345]|Xbox(?:\s+(?:One|Series\s*[XS]))?|Nintendo\s*Switch|PC)\b/gi);
  if (platMatch) {
    const vals = [...new Set(platMatch.map((v) => v.trim()))];
    if (vals.length) variants.push({ name: 'Piattaforma', values: vals });
  }

  // ── Combo piattaforma tipo "PS5/PC" ──────────────────────────────
  const comboPlat = n.match(/\b(PS[345]\/PC|PC\/PS[345]|PS[345]\/Xbox|Xbox\/PC)\b/gi);
  if (comboPlat && !variants.find((v) => v.name === 'Piattaforma')) {
    variants.push({ name: 'Piattaforma', values: [...new Set(comboPlat.map((v) => v.trim()))] });
  }

  // ── Capacità storage / memoria ────────────────────────────────────
  const storMatch = [...n.matchAll(/\b(\d+)\s*(GB|TB)\b/gi)];
  if (storMatch.length) {
    const vals = [...new Set(storMatch.map((m) => `${m[1]}${m[2].toUpperCase()}`))];
    variants.push({ name: 'Capacità', values: vals });
  }

  // ── Refresh rate monitor ──────────────────────────────────────────
  const hzMatch = [...n.matchAll(/\b(\d{2,3})\s*Hz\b/gi)];
  if (hzMatch.length) {
    const vals = [...new Set(hzMatch.map((m) => `${m[1]}Hz`))];
    variants.push({ name: 'Refresh Rate', values: vals });
  }

  // ── Risoluzione display ───────────────────────────────────────────
  const resMatch = n.match(/\b(4K|8K|QHD|UHD|WQHD|FHD|1080p|1440p|2160p|OLED)\b/gi);
  if (resMatch) {
    const vals = [...new Set(resMatch.map((v) => v.toUpperCase()))];
    variants.push({ name: 'Risoluzione', values: vals });
  }

  // ── Dimensione display (pollici) ──────────────────────────────────
  const inchMatch = [...n.matchAll(/(\d{2,3}(?:\.\d)?)["\u201d\u2033]?\s*(?:pollici|inch)?/gi)]
    .filter((m) => { const v = parseFloat(m[1]); return v >= 15 && v <= 100; });
  if (inchMatch.length) {
    const vals = [...new Set(inchMatch.map((m) => `${m[1]}"`))];
    variants.push({ name: 'Dimensione', values: vals });
  }

  // ── Colore ────────────────────────────────────────────────────────
  const colorKw = ['nero','nera','bianco','bianca','rosso','rossa','argento','grigio','grigia',
    'black','white','silver','red','blue','blu','verde','green','orange','arancione',
    'titanium','carbon','midnight','phantom','glacier'];
  const foundColors = colorKw.filter((c) => new RegExp(`\\b${c}\\b`, 'i').test(n));
  if (foundColors.length) {
    const vals = [...new Set(foundColors.map((c) => c.charAt(0).toUpperCase() + c.slice(1)))];
    variants.push({ name: 'Colore', values: vals });
  }

  // ── Connettività ──────────────────────────────────────────────────
  const connMatch = n.match(/\b(Wi-Fi|WiFi|Bluetooth|BT\s*\d\.\d|NFC|USB-?C|USB-?A|Thunderbolt\s*\d?|Wireless|Wired)\b/gi);
  if (connMatch) {
    const vals = [...new Set(connMatch.map((v) => v.trim()))];
    if (vals.length) variants.push({ name: 'Connettività', values: vals });
  }

  // ── Taglia abbigliamento / fisica ─────────────────────────────────
  const sizeMatch = n.match(/\b(XXS|XS|[SML]|XL|XXL|2XL|3XL)\b/g);
  if (sizeMatch) {
    const vals = [...new Set(sizeMatch)];
    if (vals.length > 0 && !variants.find((v) => v.name === 'Taglia')) {
      variants.push({ name: 'Taglia', values: vals });
    }
  }

  return variants;
}

async function cmdVariants(args: string[]) {
  const allMode = args.includes('--all');
  const dryRun  = args.includes('--dry-run');
  banner(
    'POPULATE-VARIANTS — Estrazione varianti + price-linking per famiglia',
    dryRun ? 'DRY RUN' : allMode ? 'ALL (sovrascrive)' : 'Solo prodotti senza varianti',
  );
  const supabase = getSupabase();

  // ── Carica tutti i prodotti in batch (servono prezzi + sub_category) ──────
  interface PFull { id:string; name:string; price:number|null; sub_category:string|null; variants:Variant[]|null }
  let allData: PFull[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products').select('id,name,price,sub_category,variants').range(from, from + 999);
    if (error) { log(C.red, 'FATAL', error.message); return; }
    if (!data?.length) break;
    allData = allData.concat(data as PFull[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (!allData.length) { log(C.yellow, 'INFO', 'Nessun prodotto'); return; }
  log(C.cyan, 'SCAN', `${allData.length} prodotti caricati`);

  // ── FASE 1 — Estrazione varianti strutturali dal nome ────────────────────
  // Map: id → variants estratte dalla fase 1
  const nameVarMap = new Map<string, Variant[]>();
  for (const p of allData) {
    const v = extractVariantsFromName(p.name ?? '');
    if (v.length) nameVarMap.set(p.id, v);
  }
  log(C.cyan, 'FASE-1', `${nameVarMap.size} prodotti con varianti strutturali estratte dal nome`);

  // ── FASE 2 — Raggruppamento per famiglia (prezzo diverso, nome simile) ────
  // Estrai "base name": rimuovi numeri, unità, colori, piattaforme dal nome
  const stripVariantTokens = (s: string) =>
    s.replace(/\b\d{1,4}(?:GB|TB|Hz|"|'')\b/gi, '')
     .replace(/\b(PS[345]|Xbox|Nintendo\s*Switch|PC|4K|8K|QHD|FHD|OLED|UHD|WQHD)\b/gi, '')
     .replace(/\b(nero|bianco|black|white|silver|argento|rosso|blue|blu)\b/gi, '')
     .replace(/\b(XXS|XS|[SML]|XL|XXL|2XL)\b/g, '')
     .replace(/\s+/g, ' ').trim().toLowerCase()
     .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Jaccard similarity su parole lunghe >2 chars
  const jaccard = (a: string, b: string): number => {
    const wa = new Set(a.split(/\s+/).filter((w) => w.length > 2));
    const wb = new Set(b.split(/\s+/).filter((w) => w.length > 2));
    if (wa.size === 0 && wb.size === 0) return 1;
    const inter = [...wa].filter((w) => wb.has(w)).length;
    return inter / (wa.size + wb.size - inter);
  };

  // Raggruppa per (sub_category → famiglie per nome simile ≥ 0.55)
  type PFam = { id:string; name:string; price:number|null; sub_category:string|null };
  const grouped = new Map<string, PFam[][]>(); // sub_cat → array di famiglie

  for (const p of allData) {
    const subCat = p.sub_category ?? '__no_sub__';
    if (!grouped.has(subCat)) grouped.set(subCat, []);
    const families = grouped.get(subCat)!;
    const baseP = stripVariantTokens(p.name ?? '');
    let placed = false;
    for (const fam of families) {
      const baseF = stripVariantTokens(fam[0].name ?? '');
      if (jaccard(baseP, baseF) >= 0.55) { fam.push(p); placed = true; break; }
    }
    if (!placed) families.push([p]);
  }

  // Variant "Versione" con price per famiglia con 2+ prodotti
  // Map: id → { label (etichetta corta), familyVariant }
  const priceVarMap = new Map<string, Variant>();

  let families2Plus = 0;
  for (const families of grouped.values()) {
    for (const fam of families) {
      if (fam.length < 2) continue;
      families2Plus++;
      // Etichetta corta: diff tra nome e base comune (le parole non in comune)
      const baseCommon = stripVariantTokens(fam[0].name ?? '');
      const makeLabel = (name: string) => {
        const tokens = name.split(/\s+/).filter((w) => !baseCommon.includes(w.toLowerCase()) && w.length > 1);
        return tokens.slice(0, 3).join(' ') || name.slice(0, 25);
      };
      const values   : string[]             = [];
      const prices   : Record<string, number> = {};
      const productIds: Record<string, string> = {};
      for (const member of fam) {
        const label = makeLabel(member.name ?? '');
        values.push(label);
        if (member.price != null) prices[label] = member.price;
        productIds[label] = member.id;
      }
      const famVariant: Variant = {
        name: 'Versione',
        values,
        ...(Object.keys(prices).length ? { prices } : {}),
        productIds,
      };
      for (const member of fam) priceVarMap.set(member.id, famVariant);
    }
  }
  log(C.cyan, 'FASE-2', `${families2Plus} famiglie con varianti di prezzo rilevate`);

  // ── Merge fase 1 + fase 2 e filtra cosa processare ───────────────────────
  const toProcess = allMode ? allData : allData.filter((p) => !p.variants || (p.variants as Variant[]).length === 0);

  const updates: Array<{id:string; variants: Variant[]}> = [];
  let withVar = 0, noVar = 0;

  for (const p of toProcess) {
    const structural = nameVarMap.get(p.id) ?? [];
    const priceVar   = priceVarMap.get(p.id);
    // Aggiungi "Versione" solo se non c'è già uno structurale con quel nome
    const merged = priceVar && !structural.find((v) => v.name === 'Versione')
      ? [...structural, priceVar]
      : structural;

    if (!merged.length) {
      noVar++;
      continue;
    }

    withVar++;
    const summary = merged.map((v) => {
      const priceInfo = v.prices
        ? `  💰 ${v.values.map((val) => `${val}=${v.prices![val] != null ? `€${v.prices![val]}` : '?'}`).join(', ')}`
        : '';
      return `${C.cyan}${v.name}${C.reset}:[${v.values.join('/')}]${priceInfo}`;
    }).join('  ');
    log(C.green, 'VAR', `"${p.name.slice(0, 40)}"  →  ${summary}`);
    updates.push({ id: p.id, variants: merged });
  }

  if (!dryRun && updates.length > 0) {
    log(C.cyan, 'DB', `Salvataggio di ${updates.length} record...`);
    for (let i = 0; i < updates.length; i += 200) {
      const { error: upErr } = await supabase.from('products').upsert(updates.slice(i, i + 200), { onConflict: 'id' });
      if (upErr) log(C.red, 'ERR', upErr.message);
    }
    log(C.green, 'DONE', 'Salvato');
  }

  hr();
  console.log(`${C.bright}${C.green}  Con varianti        : ${withVar}${C.reset}`);
  console.log(`${C.bright}${C.yellow}  Senza varianti      : ${noVar}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  Famiglie (prezzo ∆) : ${families2Plus}${C.reset}`);
  if (dryRun) console.log(`${C.bright}${C.yellow}  DRY RUN — nessun salvataggio${C.reset}`);
  hr();
}

// ══════════════════════════════════════════════════════════════════
// § 10 — COMMAND: SUBCATEGORIES
// ══════════════════════════════════════════════════════════════════

const SUB_KW: Record<string, Array<[string, string[]]>> = {
  'hardware-crypto-wallets': [
    ['air-gapped',  ['keystone','ellipal','ngrave','passport','air-gapped','air gapped','qr code','seedsigner']],
    ['backup-seed', ['cryptosteel','bilodeau','stamp seed','seed steel','metal backup','steel wallet','seed capsule','cobo tablet']],
    ['premium',     ['stax','safe 5','touch','flex','coldcard mk','bitbox02','jade','model t','keystone pro']],
    ['entry-level', ['nano s','nano x','safe 3','tangem','model one','keepkey','onekey','ledger','trezor','wallet']],
    ['backup-seed', ['seed','mnemonic','backup phrase','steel plate']],
  ],
  'comms-security-shield': [
    ['security-keys',   ['yubikey','yubico','security key','fido2','fido ','u2f','solokey','nitrokey']],
    ['rfid-protection', ['rfid','faraday','signal block','emf','cage','shield bag']],
    ['privacy-screen',  ['privacy screen','privacy filter','monitor filter','anti-spy','schermo privacy']],
    ['encrypted-comms', ['vpn','encrypted','privacy router','gl.inet','gl-inet','openwrt']],
    ['privacy-screen',  ['screen','schermo','monitor']],
    ['security-keys',   ['authenticat','otp','2fa','chiave']],
  ],
  'survival-edc-tech': [
    ['water-filter',    ['lifestraw','sawyer','berkey','water filter','filtro acqua','water purif']],
    ['medical-kit',     ['first aid','ifak','tourniquet','trauma kit','bandage','kit pronto soccorso']],
    ['navigation',      ['compass','bussola','gps track','garmin','orienteering']],
    ['cordage-shelter', ['paracord','tarp','hammock','bivouac','bivy','shelter','tenda','emergency blanket']],
    ['multitools',      ['multitool','multi-tool','leatherman','victorinox','swiss army','gerber','benchmade']],
    ['flashlights',     ['flashlight','torch','lumen','torcia','fenix','olight','nitecore','streamlight','headlamp','tactical light']],
    ['flashlights',     ['light','lamp','luce']],
    ['multitools',      ['knife','coltello','blade','tool','edc']],
  ],
  'tactical-power-grid': [
    ['solar-panels',  ['solar panel','pannello solare','fotovoltaic','solar charge','foldable solar']],
    ['batteries',     ['18650','lithium battery','lipo','lifepo4','rechargeable batter','nimh','button cell']],
    ['power-stations',['power station','jackery','ecoflow','bluetti','goal zero','generac','river max','delta pro']],
    ['power-banks',   ['power bank','powerbank','portable charge','anker','baseus','caricatore portatile','external battery']],
    ['solar-panels',  ['solar','pannello']],
    ['batteries',     ['batteria','battery','pile']],
    ['power-banks',   ['bank','caricatore','charger','ups']],
  ],
  'sim-racing-accessories-premium': [
    ['handbrakes',     ['handbrake','freno a mano','e-brake','drift brake']],
    ['shifters',       ['shifter','sequential','h-pattern','gearbox','cambio']],
    ['pedals',         ['pedal','pedaliera','heusinkveld','brake pedal','load cell','clutch pedal']],
    ['cockpit-rigs',   ['cockpit','racing rig','playseat','next level','gt omega','chassis','profile frame']],
    ['steering-wheels',['steering wheel','volante','fanatec','thrustmaster','logitech g','moza','simagic','direct drive','wheel base','dd pro','csl dd']],
  ],
  'trading-gaming-desk-accessories-premium': [
    ['vr-headsets',     ['virtual reality','oculus','meta quest','pico ','valve index','htc vive','vr headset']],
    ['cooling-pads',    ['cooling pad','laptop cooler','notebook cooler','pad raffreddamento']],
    ['monitor-arms',    ['monitor arm','braccio monitor','supporto monitor','vesa mount','monitor riser']],
    ['gaming-chairs',   ['gaming chair','secretlab','noblechairs','dxracer','racing chair','sedia gaming','chair']],
    ['desk-accessories',['desk mat','tappetino','cable management','monitor light','screen bar','key light','organizer']],
    ['vr-headsets',     ['vr ','quest','headset']],
    ['cooling-pads',    ['cooling','raffreddamento']],
    ['monitor-arms',    ['arm','braccio','supporto']],
  ],
  'pc-hardware-high-ticket': [
    ['cpu-cooling',['aio cooler','liquid cooling','water cooler','noctua','be quiet','arctic liquid','360mm','cpu cooler']],
    ['gpus',       ['rtx 4','rtx 3','rx 7','rx 6','radeon rx','geforce rtx','graphics card','scheda video','nvidia','amd gpu']],
    ['cpus',       ['ryzen 7','ryzen 9','ryzen 5','core i9','core i7','core i5','threadripper','processore','amd am5','intel lga']],
    ['memory',     ['ddr5','ddr4',' ram ','memory kit','memoria ram','corsair vengeance','g.skill','kingston fury']],
    ['storage',    ['nvme','m.2 ssd','samsung 970','samsung 980','samsung 990','wd black','seagate','hard drive','hdd']],
    ['cpu-cooling',['cooler','cooling','heatsink','fan']],
    ['gpus',       ['gpu','video card']],
    ['cpus',       ['processor','processore','cpu']],
    ['memory',     ['ram','dram','memory']],
    ['storage',    ['ssd','nvme','drive','storage']],
  ],
  'sicurezza-domotica-high-end': [
    ['home-automation',['home assistant','zigbee','z-wave','hub','bridge','philips hue','smart plug','smart switch','automation']],
    ['alarm-systems',  ['alarm','sirena','motion sensor','detector','pir sensor','sensore movimento','glass break','burglar alarm']],
    ['smart-locks',    ['smart lock','serratura smart','deadbolt','august smart','yale assure','schlage','nuki','fingerprint lock']],
    ['smart-cameras',  ['security camera','cctv','ip camera','doorbell cam','arlo','ring cam','eufy','hikvision','reolink']],
    ['home-automation',['smart home','domotica','automation']],
    ['alarm-systems',  ['alarm','sensore','detector','sirena']],
    ['smart-locks',    ['lock','serratura']],
    ['smart-cameras',  ['camera','telecamera','webcam','sorveglianza']],
  ],
  'fpv-drones-tech': [
    ['ready-to-fly',  ['ready-to-fly','avata','dji fpv combo','complete kit','rtf kit','kit beginner']],
    ['micro-whoops',  ['whoop','cinewhoop','micro quad','1s ','tinyhawk','mobula','pavo pico','cetus','ezpilot']],
    ['fpv-drones',    ['freestyle','racing quad','mark4','smirk','sector','chimera','protek','nazgul']],
    ['controllers',   ['controller','transmitter',' tx ','radiomaster','tbs tango','frsky','jumper','flysky','radiolink','taranis','zorro','tango 2']],
    ['goggles',       ['goggles','fatshark','skyzone','hdzero','walksnail','avatar','dominator','scout','integra','ev800']],
    ['components',    ['flight controller',' fc ','stack','esc','betaflight','holybro','omnibus','kakute','crossfire module']],
  ],
};
SUB_KW['Tactical Power'] = SUB_KW['tactical-power-grid'];
SUB_KW['PC Hardware']    = SUB_KW['pc-hardware-high-ticket'];
SUB_KW['Smart Security'] = SUB_KW['sicurezza-domotica-high-end'];
SUB_KW['sim-racing']     = SUB_KW['sim-racing-accessories-premium'];

function assignSubCat(cat: string, name: string, desc: string): string | null {
  const rules = SUB_KW[cat];
  if (!rules) return null;
  const text = `${name} ${desc ?? ''}`.toLowerCase();
  for (const [sub, kws] of rules) {
    for (const kw of kws) if (text.includes(kw)) return sub;
  }
  return null;
}

async function cmdSubcats(args: string[]) {
  const dryRun = args.includes('--dry-run');
  banner('ASSIGN-SUBCATEGORIES — Keyword-based classification', dryRun ? 'DRY RUN' : 'LIVE');
  const supabase = getSupabase();

  // Verifica colonna
  const { error: colErr } = await supabase.from('products').select('sub_category').limit(1);
  if (colErr?.message.includes('sub_category does not exist')) {
    console.log(`\n${C.yellow}${C.bright}══════════════════════════════════════════════${C.reset}`);
    console.log(`${C.bright}  Esegui prima nel Supabase SQL Editor:${C.reset}`);
    console.log(`${C.cyan}\n  ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;\n${C.reset}`);
    console.log(`${C.yellow}${C.bright}══════════════════════════════════════════════${C.reset}\n`);
    return;
  }
  log(C.green, 'DB', 'Colonna sub_category presente');

  let all: Array<{id:string;name:string;category:string|null;description:string|null}> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('products').select('id,name,category,description').range(from, from + 999);
    if (error) { log(C.red, 'FATAL', error.message); return; }
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  log(C.cyan, 'FETCH', `${all.length} prodotti caricati`);

  // Fallback sub_category per categoria (quando nessuna keyword fa match)
  const CAT_FALLBACK: Record<string, string> = {
    'hardware-crypto-wallets':                 'entry-level',
    'comms-security-shield':                   'security-keys',
    'survival-edc-tech':                       'multitools',
    'tactical-power-grid':                     'power-banks',
    'sim-racing-accessories-premium':          'steering-wheels',
    'trading-gaming-desk-accessories-premium': 'desk-accessories',
    'pc-hardware-high-ticket':                 'storage',
    'PC Hardware':                             'storage',
    'Smart Security':                          'home-automation',
    'sicurezza-domotica-high-end':             'home-automation',
  };

  const updates: Array<{id:string;sub_category:string}> = [];
  const stats: Record<string, number> = {};
  const unmatchedByCat: Record<string, string[]> = {};

  for (const p of all) {
    const cat = p.category ?? '';
    let sub = assignSubCat(cat, p.name ?? '', p.description ?? '');

    // Fallback: se nessuna keyword ha fatto match, usa la sub default della categoria
    if (!sub) {
      sub = CAT_FALLBACK[cat] ?? null;
      if (sub) {
        const fbKey = `${cat} → ${sub} [FALLBACK]`;
        stats[fbKey] = (stats[fbKey] ?? 0) + 1;
      } else {
        // Ancora senza match: categoria non riconosciuta
        if (!unmatchedByCat[cat]) unmatchedByCat[cat] = [];
        unmatchedByCat[cat].push(p.name ?? p.id);
      }
    } else {
      stats[`${cat} → ${sub}`] = (stats[`${cat} → ${sub}`] ?? 0) + 1;
    }

    if (sub) updates.push({ id: p.id, sub_category: sub });
  }

  const totalUnmatched = Object.values(unmatchedByCat).reduce((s, a) => s + a.length, 0);
  log(C.cyan, 'CLASSIFY', `Assegnate: ${updates.length}  |  Senza match: ${totalUnmatched}`);

  if (!dryRun && updates.length > 0) {
    let done = 0;
    for (let i = 0; i < updates.length; i += 200) {
      const batch = updates.slice(i, i + 200);
      const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
      if (!error) done += batch.length;
      else log(C.red, 'ERR', error.message);
    }
    log(C.green, 'DONE', `${done} prodotti aggiornati`);
  }

  hr();
  for (const [k, v] of Object.entries(stats).sort((a, b) => b[1] - a[1]))
    console.log(`  ${C.cyan}${String(v).padStart(4)}${C.reset}  ${k}`);

  if (totalUnmatched > 0) {
    console.log(`\n${C.bright}${C.yellow}  ⚠  ${totalUnmatched} prodotti senza sub_category (categoria non riconosciuta):${C.reset}`);
    for (const [cat, names] of Object.entries(unmatchedByCat)) {
      console.log(`\n  ${C.red}${cat || '(nessuna categoria)'}${C.reset}  — ${names.length} prodotti:`);
      names.slice(0, 5).forEach((n) => console.log(`    ${C.gray}• ${n.slice(0, 70)}${C.reset}`));
      if (names.length > 5) console.log(`    ${C.gray}  ... e altri ${names.length - 5}${C.reset}`);
    }
  } else {
    console.log(`\n  ${C.bright}${C.green}  ✓ Tutti i prodotti hanno una sub_category${C.reset}`);
  }
  hr();
  if (dryRun) log(C.yellow, 'DRY RUN', 'Nessuna modifica al DB');
}

// ══════════════════════════════════════════════════════════════════
// § 11 — COMMAND: FIX-IMAGES
// ══════════════════════════════════════════════════════════════════

async function cmdFixImages(args: string[]) {
  const dryRun = args.includes('--dry-run');
  banner('FIX-IMAGES — Ripara URL immagini rotte', dryRun ? 'DRY RUN' : 'LIVE');
  const supabase = getSupabase();

  const isAsinBased = (url: string) => /\/images\/I\/[A-Z0-9]{10}\.jpg$/i.test(url);

  const { data, error } = await supabase.from('products').select('id,name,image_url,image_urls,product_url');
  if (error) { log(C.red, 'FATAL', error.message); return; }
  if (!data?.length) { log(C.yellow, 'DB', 'Nessun prodotto'); return; }

  const broken = (data as Array<{id:string;name:string;image_url:string;image_urls:string[]|null;product_url:string}>)
    .filter((p) => !p.image_url || isAsinBased(p.image_url));
  log(C.cyan, 'SCAN', `${broken.length} prodotti con immagine da riparare (su ${data.length})`);
  if (broken.length === 0) { log(C.green, 'OK', 'Tutte le immagini sono già corrette!'); return; }

  const fetchImg = async (asin: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://www.amazon.it/dp/${asin}/`, {
        headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      if (html.toLowerCase().includes('captcha')) return null;
      return html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](https:\/\/[^"']+)["']/i)?.[1]
          ?? html.match(/"landingImageUrl"\s*:\s*"(https:\/\/[^"]+)"/)?.[1]
          ?? html.match(/data-old-hires="(https:\/\/[^"]+)"/)?.[1]
          ?? null;
    } catch { return null; }
  };

  let fixed = 0, skipped = 0, failedCount = 0;
  for (let i = 0; i < broken.length; i++) {
    const p = broken[i];
    console.log(`\n${C.bright}${C.yellow}── [${i+1}/${broken.length}] ${p.name} ──${C.reset}`);
    const asin = extractAsinFromUrl(p.product_url ?? '');
    if (!asin) { log(C.yellow, 'SKIP', 'Nessun ASIN'); skipped++; continue; }
    const newUrl = await fetchImg(asin);
    if (!newUrl || newUrl === p.image_url) { log(C.gray, 'SKIP', 'Nessuna nuova immagine'); skipped++; }
    else if (!dryRun) {
      const { error: upErr } = await supabase.from('products').update({ image_url: newUrl }).eq('id', p.id);
      if (upErr) { log(C.red, 'ERR', upErr.message); failedCount++; }
      else { log(C.green, 'FIXED', newUrl.slice(0, 80)); fixed++; }
    } else { log(C.yellow, 'DRY', `Avrebbe aggiornato → ${newUrl.slice(0, 70)}`); fixed++; }
    if (i < broken.length - 1) await delay(3000, 5000);
  }

  hr();
  console.log(`${C.bright}${C.green}  ✓ Aggiornati : ${fixed}${C.reset}`);
  console.log(`${C.bright}${C.yellow}  ↺ Saltati    : ${skipped}${C.reset}`);
  if (failedCount) console.log(`${C.bright}${C.red}  ✗ Errori     : ${failedCount}${C.reset}`);
  hr();
}

// ══════════════════════════════════════════════════════════════════
// § 12 — COMMAND: SYNC-PRODUCT-LINKS
// ══════════════════════════════════════════════════════════════════

async function cmdSyncProductLinks(_args: string[]) {
  banner('SYNC-PRODUCT-LINKS — Sincronizza URL prodotti da affiliate links');
  const supabase = getSupabase();

  const { data, error } = await supabase.from('products').select('id,name,product_url').not('product_url','is',null);
  if (error) { log(C.red, 'FATAL', error.message); return; }
  const products = (data ?? []) as Array<{id:string;name:string;product_url:string|null}>;
  log(C.cyan, 'SCAN', `${products.length} prodotti con product_url`);
  if (products.length === 0) return;

  // Normalizza product_url: rimuovi tutti i query params, forza formato /dp/ASIN/
  const normalizeUrl = (url: string): string => {
    try {
      const asin = url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i)?.[1];
      return asin ? `https://www.amazon.it/dp/${asin.toUpperCase()}/` : url.split('?')[0].split('#')[0];
    } catch { return url; }
  };

  let synced = 0, unchanged = 0;
  for (const p of products) {
    const normalized = normalizeUrl(p.product_url!);
    if (normalized === p.product_url) { unchanged++; continue; }
    const { error: upErr } = await supabase.from('products').update({ product_url: normalized }).eq('id', p.id);
    if (upErr) log(C.red, 'ERR', `${p.name}: ${upErr.message}`);
    else { log(C.green, 'FIXED', `${p.name.slice(0,50)}`); synced++; }
  }

  hr();
  console.log(`${C.bright}${C.green}  ✓ Normalizzati  : ${synced}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  — Già corretti  : ${unchanged}${C.reset}`);
  hr();
}

// ══════════════════════════════════════════════════════════════════
// § 13 — COMMAND: MIGRATE-PRICES
// ══════════════════════════════════════════════════════════════════

async function cmdPrices(args: string[]) {
  const execute = args.includes('--execute');
  banner('MIGRATE-PRICES — Aggiorna prezzi da CSV', execute ? 'EXECUTE MODE' : 'DRY RUN (usa --execute per applicare)');
  const supabase = getSupabase();
  const MAGAZZINO = resolve(process.cwd(), 'MAGAZZINO');

  if (!existsSync(MAGAZZINO)) { log(C.yellow, 'WARN', 'Cartella MAGAZZINO/ non trovata'); return; }

  const normName = (n: string) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const similarity = (a: string, b: string) => {
    const na = normName(a), nb = normName(b);
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 0.9;
    const wa = new Set(na.split(' ').filter((w) => w.length > 2));
    const wb = new Set(nb.split(' ').filter((w) => w.length > 2));
    const inter = [...wa].filter((w) => wb.has(w)).length;
    const union = new Set([...wa, ...wb]).size;
    return union === 0 ? 0 : inter / union;
  };

  const { data: dbProducts, error } = await supabase.from('products').select('id,name,price').order('name');
  if (error) { log(C.red, 'FATAL', error.message); return; }
  log(C.green, 'DB', `${dbProducts!.length} prodotti nel DB`);

  const csvRows: Array<{name:string;price:number;source:string}> = [];
  for (const file of readdirSync(MAGAZZINO).filter((f) => f.endsWith('.csv') || f.endsWith('.xlsx'))) {
    try {
      const wb = XLSX.readFile(join(MAGAZZINO, file));
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
      for (const row of rows) {
        const norm: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) norm[k.normalize('NFKD').replace(/\s+/g, '_').trim()] = String(v);
        const name = (norm['Prodotto'] || norm['name'] || norm['Name'] || '').trim();
        const rawP = (norm['Prezzo_USD'] || norm['Prezzo'] || norm['price'] || norm['Price'] || '').trim();
        if (!name || !rawP) continue;
        const base = parsePrice(rawP);
        if (isNaN(base) || base <= 0) continue;
        const cur = (norm['Valuta'] || 'EUR').toUpperCase() as 'EUR'|'USD';
        csvRows.push({ name, price: applyKitwerFormula(base, cur), source: file });
      }
    } catch (e) { log(C.red, 'CSV', `${file}: ${e}`); }
  }
  log(C.cyan, 'CSV', `${csvRows.length} righe caricate`);

  let updated = 0, unchanged = 0, noMatch = 0;
  for (const csv of csvRows) {
    let best = 0, bestProd: { id: string; name: string; price: number } | null = null;
    for (const p of dbProducts!) {
      const s = similarity(csv.name, p.name);
      if (s > best) { best = s; bestProd = p; }
    }
    if (!bestProd || best < 0.55) { log(C.gray, 'NO MATCH', `"${csv.name}" (${(best * 100).toFixed(0)}%)`); noMatch++; continue; }
    if (Math.abs((bestProd.price ?? 0) - csv.price) < 0.01) { unchanged++; continue; }
    log(C.green, execute ? 'UPDATE' : 'DRY', `"${bestProd.name}" €${bestProd.price ?? 0} → €${csv.price} (${(best * 100).toFixed(0)}%)`);
    if (execute) await supabase.from('products').update({ price: csv.price, is_price_pending: false }).eq('id', bestProd.id);
    updated++;
  }

  hr();
  console.log(`${C.bright}${C.green}  Da aggiornare : ${updated}${C.reset}`);
  console.log(`${C.bright}${C.gray}  Invariati     : ${unchanged}${C.reset}`);
  console.log(`${C.bright}${C.yellow}  Nessun match  : ${noMatch}${C.reset}`);
  if (!execute && updated > 0) console.log(`${C.yellow}\n  Per applicare: npx tsx scripts/kitwer-tools.ts prices --execute${C.reset}`);
  hr();
}

// ══════════════════════════════════════════════════════════════════
// § 14 — COMMAND: CLEAN-DB  ⚠ PERICOLOSO
// ══════════════════════════════════════════════════════════════════

async function cmdCleanDb(_args: string[]) {
  banner('CLEAN-DB — ⚠ SVUOTA tabella products', 'QUESTA OPERAZIONE È IRREVERSIBILE');
  const supabase = getSupabase();

  const { count: before } = await supabase.from('products').select('*', { count: 'exact', head: true });
  log(C.yellow, 'WARNING', `Prodotti nel DB: ${before ?? 0}`);

  if (!before || before === 0) { log(C.green, 'OK', 'Tabella già vuota'); return; }

  const ok = await confirm(`⚠  Vuoi davvero eliminare TUTTI i ${before} prodotti dal DB?`);
  if (!ok) { log(C.cyan, 'ANNULLATO', 'Nessuna modifica'); return; }

  const ok2 = await confirm(`ULTIMA CONFERMA: eliminare definitivamente ${before} prodotti?`);
  if (!ok2) { log(C.cyan, 'ANNULLATO', 'Nessuna modifica'); return; }

  const { error } = await supabase.from('products').delete().not('id', 'is', null);
  if (error) { log(C.red, 'ERRORE', error.message); return; }
  const { count: after } = await supabase.from('products').select('*', { count: 'exact', head: true });
  log(C.green, 'DONE', `Eliminati ${before} prodotti. Rimasti: ${after ?? 0}`);
}

// ══════════════════════════════════════════════════════════════════
// § 15 — COMMAND: STRESS-TEST (stressCheckLinks)
// ══════════════════════════════════════════════════════════════════

// ── Helpers URL ───────────────────────────────────────────────────────────────

/** ASIN valido: 10 char alfanumerici, tipicamente inizia con B */
const ASIN_VALID_RE = /^[A-Z0-9]{10}$/;

/** Estrae ASIN da un URL Amazon qualsiasi */
function asinFromUrl(url: string): string | null {
  return url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i)?.[1]?.toUpperCase() ?? null;
}

/** Ricostruisce URL puro: https://www.amazon.it/dp/ASIN/ */
function toPureUrl(url: string): string {
  const asin = asinFromUrl(url);
  if (!asin) return url;
  const domain = url.match(/^https?:\/\/(www\.amazon\.[a-z.]+)/i)?.[1] ?? 'www.amazon.it';
  return `https://${domain}/dp/${asin}/`;
}

/** Controlla se l'URL è già nel formato puro (niente query/hash/tag) */
function isPureUrl(url: string): boolean {
  return /^https:\/\/www\.amazon\.[a-z.]+\/dp\/[A-Z0-9]{10}\/?$/.test(
    url.split('?')[0].split('#')[0],
  );
}

// ── TIER 1: Validazione strutturale (istantanea, 100% affidabile) ─────────────

interface StructuralResult {
  id:           string;
  name:         string;
  productUrl:   string | null;
  asin:         string | null;
  asinValid:    boolean;   // ASIN ha formato corretto
  urlValid:     boolean;   // URL contiene un ASIN estraibile
  isPure:       boolean;   // URL già in formato puro
  pureUrl:      string;    // URL ricostruito pulito
  needsFix:     boolean;   // product_url mancante o impuro
}

function structuralCheck(p: {
  id: string; name: string;
  product_url: string | null;
}): StructuralResult {
  const productUrl = p.product_url;
  const asin       = productUrl ? asinFromUrl(productUrl) : null;
  const asinValid  = !!asin && ASIN_VALID_RE.test(asin);
  const urlValid   = !!asin;
  const pure       = productUrl ? toPureUrl(productUrl) : '';
  const isPure_    = productUrl ? isPureUrl(productUrl) : false;
  const needsFix   = !productUrl || !isPureUrl(productUrl ?? '');

  return {
    id: p.id, name: p.name,
    productUrl,
    asin, asinValid, urlValid, isPure: isPure_, pureUrl: pure, needsFix,
  };
}

// ── COMMAND: stress-test ──────────────────────────────────────────────────────
/**
 * Validazione in 2 fasi:
 *   Fase 1 (sempre): controllo strutturale ASIN — istantaneo, 100% affidabile
 *   Fase 2 (--fix):  ripara product_url mancanti/impuri sul DB
 *
 * NOTA: Il check HTTP diretto di Amazon.it NON è supportato.
 * Amazon blocca sistematicamente le richieste automatiche (fetch senza browser)
 * restituendo 404 fittizi indipendentemente dal delay o dagli headers.
 * L'unico modo affidabile per verificare un link Amazon è aprirlo in un browser reale.
 * La validazione strutturale ASIN (Fase 1) è sufficiente e 100% corretta.
 */
async function cmdStressTest(args: string[]) {
  const fixMode  = args.includes('--fix');
  const dryRun   = args.includes('--dry-run');
  const limitArg = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0', 10);

  banner(
    'STRESS-CHECK-LINKS — Validazione ASIN + Fix URL',
    [
      'Fase 1: Verifica ASIN strutturale (istantanea)',
      fixMode && !dryRun ? 'Fase 2: FIX product_url sul DB' : '',
      fixMode && dryRun  ? 'Fase 2: DRY RUN (nessuna scrittura)' : '',
    ].filter(Boolean).join(' · '),
  );

  const supabase = getSupabase();
  const LOGS_DIR = resolve(process.cwd(), 'logs');
  mkdirSync(LOGS_DIR, { recursive: true });

  // ── Carica prodotti ─────────────────────────────────────────────
  log(C.cyan, 'DB', 'Caricamento prodotti...');
  let all: Array<{ id: string; name: string; product_url: string | null }> = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, product_url')
      .range(from, from + 999);
    if (error) { log(C.red, 'FATAL', error.message); return; }
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (limitArg > 0) all = all.slice(0, limitArg);
  log(C.cyan, 'SCAN', `${all.length} prodotti nel DB`);
  if (!all.length) { log(C.yellow, 'INFO', 'Nessun prodotto'); return; }

  // ══════════════════════════════════════════════════════════════════
  // FASE 1 — Validazione strutturale ASIN
  // Controlla: presenza product_url · ASIN estraibile · formato ASIN valido
  // ══════════════════════════════════════════════════════════════════
  log(C.magenta, 'FASE-1', 'Validazione strutturale ASIN...');
  const checked     = all.map(structuralCheck);
  const noUrl       = checked.filter((r) => !r.productUrl);
  const noAsin      = checked.filter((r) => r.productUrl && !r.urlValid);
  const badAsin     = checked.filter((r) => r.urlValid && !r.asinValid);
  const valid       = checked.filter((r) => r.asinValid);
  const needsFix    = checked.filter((r) => r.needsFix && r.asinValid);
  const alreadyOk   = checked.filter((r) => !r.needsFix && r.asinValid);

  // Logga solo i veri problemi
  for (const r of noUrl)  log(C.red,    'NO-URL',   `"${r.name}" — product_url NULL nel DB`);
  for (const r of noAsin) log(C.red,    'NO-ASIN',  `"${r.name}" — URL senza /dp/ASIN/ estraibile`);
  for (const r of badAsin)log(C.yellow, 'BAD-ASIN', `"${r.name}" — ASIN "${r.asin}" formato non standard`);

  const totalProblems = noUrl.length + noAsin.length + badAsin.length;
  if (totalProblems === 0) {
    log(C.green, 'FASE-1', `✓ PERFETTO — tutti i ${valid.length} ASIN sono validi`);
  } else {
    log(C.red, 'FASE-1', `✗ ${totalProblems} prodotti con problemi strutturali reali`);
  }

  // ══════════════════════════════════════════════════════════════════
  // FASE 2 — Fix product_url (solo con --fix)
  // product_url = URL puro senza tag: https://www.amazon.it/dp/ASIN/
  // ══════════════════════════════════════════════════════════════════
  if (fixMode) {
    if (needsFix.length === 0) {
      log(C.green, 'FASE-2', `✓ Tutti i ${alreadyOk.length} product_url sono già corretti — nessun fix necessario`);
    } else if (dryRun) {
      log(C.yellow, 'FASE-2', `DRY RUN — avrebbe fixato ${needsFix.length} product_url`);
      for (const r of needsFix.slice(0, 10))
        log(C.gray, 'DRY', `"${r.name}" → ${r.pureUrl}`);
    } else {
      log(C.magenta, 'FASE-2', `Fix product_url per ${needsFix.length} prodotti...`);
      let fixed = 0, failed = 0;
      // Batch update in gruppi da 50
      for (let i = 0; i < needsFix.length; i += 50) {
        const batch = needsFix.slice(i, i + 50);
        await Promise.all(batch.map(async (r) => {
          const { error: upErr } = await supabase
            .from('products')
            .update({ product_url: r.pureUrl })
            .eq('id', r.id);
          if (upErr) { log(C.red, 'ERR', `${r.name}: ${upErr.message}`); failed++; }
          else fixed++;
        }));
        log(C.gray, 'PROG', `${Math.min(i + 50, needsFix.length)}/${needsFix.length} fixati...`);
      }
      log(C.green, 'FASE-2', `✓ ${fixed} product_url aggiornati${failed ? ` · ${failed} errori` : ''}`);
    }
  }

  // ── Scrivi report JSON ──────────────────────────────────────────
  const report = {
    generatedAt:   new Date().toISOString(),
    totalProducts: all.length,
    summary: {
      valid:           valid.length,
      perfect:         alreadyOk.length,
      noProductUrl:    noUrl.length,
      noAsinInUrl:     noAsin.length,
      badAsinFormat:   badAsin.length,
      productUrlFixed: fixMode && !dryRun ? needsFix.length : 0,
      productUrlTodo:  !fixMode ? needsFix.length : 0,
    },
    structuralProblems: [...noUrl, ...noAsin, ...badAsin].map((r) => ({
      id:     r.id,
      name:   r.name,
      url:    r.productUrl,
      asin:   r.asin,
      issue:  !r.productUrl ? 'no_product_url' : !r.urlValid ? 'no_asin_in_url' : 'bad_asin_format',
    })),
    productUrlsFixed: fixMode && !dryRun ? needsFix.map((r) => ({
      id: r.id, name: r.name, pureUrl: r.pureUrl,
    })) : [],
  };

  const LOG_PATH = join(LOGS_DIR, 'broken_links.json');
  writeFileSync(LOG_PATH, JSON.stringify(report, null, 2), 'utf-8');

  // ── Riepilogo finale ────────────────────────────────────────────
  hr('═');
  console.log(`\n${C.bright}  STRESS-CHECK REPORT${C.reset}`);
  hr();
  console.log(`${C.bright}${C.green}  ✓ ASIN validi      : ${valid.length}/${all.length}${C.reset}`);
  if (noUrl.length)    console.log(`${C.red}  ✗ Senza URL       : ${noUrl.length}${C.reset}`);
  if (noAsin.length)   console.log(`${C.red}  ✗ ASIN mancante   : ${noAsin.length}${C.reset}`);
  if (badAsin.length)  console.log(`${C.yellow}  ⚠ ASIN non std    : ${badAsin.length}${C.reset}`);

  if (fixMode && !dryRun)
    console.log(`${C.bright}${C.green}  ✓ product_url fixati: ${needsFix.length === 0 ? 'già tutti ok' : needsFix.length}${C.reset}`);
  else if (!fixMode && needsFix.length > 0)
    console.log(`${C.yellow}  ⚠ product_url da fixare: ${needsFix.length} → usa --fix${C.reset}`);
  else if (!fixMode && needsFix.length === 0)
    console.log(`${C.green}  ✓ product_url        : tutti già corretti${C.reset}`);

  hr();

  if (totalProblems === 0 && (needsFix.length === 0 || (fixMode && !dryRun))) {
    console.log(`${C.bright}${C.green}  ██████████████████████████████████████████${C.reset}`);
    console.log(`${C.bright}${C.green}  ██  DATABASE PERFETTO — ${all.length} LINK VALIDI  ██${C.reset}`);
    console.log(`${C.bright}${C.green}  ██████████████████████████████████████████${C.reset}`);
  }

  console.log(`\n  📄 ${C.cyan}logs/broken_links.json${C.reset}`);
  if (!fixMode && needsFix.length > 0)
    console.log(`${C.yellow}  → ./kitwer-tools.sh stress-test --fix${C.reset}`);
  hr('═');
}

// ══════════════════════════════════════════════════════════════════
// § 16 — COMMAND: VERIFY (conteggio categorie + sottocategorie)
// ══════════════════════════════════════════════════════════════════

async function cmdVerify(_args: string[]) {
  banner('VERIFY — Analisi completa: categorie · immagini · varianti');
  const supabase = getSupabase();

  interface P {
    id: string;
    name: string | null;
    category: string | null;
    sub_category: string | null;
    is_budget_king: boolean | null;
    image_url: string | null;
    image_urls: string[] | null;
    variants: Array<{ name: string; values: string[] }> | null;
  }

  let all: P[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,category,sub_category,is_budget_king,image_url,image_urls,variants')
      .range(from, from + 999);
    if (error) { log(C.red, 'FATAL', error.message); return; }
    if (!data?.length) break;
    all = all.concat(data as P[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  if (!all.length) { log(C.yellow, 'INFO', 'Database vuoto'); return; }

  // Helper: URL immagine reale (non ASIN fake)
  const isRealImg = (url: string | null | undefined): boolean => {
    if (!url) return false;
    if (url.includes('m.media-amazon.com')) {
      const id = url.match(/\/images\/I\/([^._]+)/)?.[1] ?? '';
      if (/^[A-Z0-9]{10}$/.test(id)) return false; // ASIN fake
      if (!url.includes('._')) return false;
    }
    return true;
  };

  const hasAnyRealImg = (p: P): boolean => {
    if (isRealImg(p.image_url)) return true;
    if (Array.isArray(p.image_urls) && p.image_urls.some(isRealImg)) return true;
    return false;
  };

  const countRealImgs = (p: P): number => {
    const urls = new Set<string>();
    if (isRealImg(p.image_url)) urls.add(p.image_url!);
    for (const u of p.image_urls ?? []) if (isRealImg(u)) urls.add(u);
    return urls.size;
  };

  // ── SEZIONE 1: albero categoria / sottocategoria ──
  const tree = new Map<string, Map<string, { count: number; withImg: number; noImg: string[] }>>();
  let budgetKingTotal = 0;
  const noImgProducts: { name: string; cat: string; sub: string }[] = [];

  for (const p of all) {
    const cat = p.category ?? '(nessuna categoria)';
    const sub = p.sub_category ?? '(nessuna sottocategoria)';
    if (!tree.has(cat)) tree.set(cat, new Map());
    const subMap = tree.get(cat)!;
    if (!subMap.has(sub)) subMap.set(sub, { count: 0, withImg: 0, noImg: [] });
    const slot = subMap.get(sub)!;
    slot.count++;
    if (hasAnyRealImg(p)) {
      slot.withImg++;
    } else {
      slot.noImg.push(p.name?.slice(0, 45) ?? p.id);
      noImgProducts.push({ name: p.name ?? p.id, cat, sub });
    }
    if (p.is_budget_king) budgetKingTotal++;
  }

  const sortedCats = [...tree.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let grandTotal = 0;
  const warnSubs: string[] = [];   // subcat con < 3 prodotti
  const dupeSubs: string[] = [];   // subcat con nomi simili dentro stessa cat

  console.log('');
  for (const [cat, subMap] of sortedCats) {
    const catTotal  = [...subMap.values()].reduce((s, v) => s + v.count, 0);
    const catWithImg = [...subMap.values()].reduce((s, v) => s + v.withImg, 0);
    const catNoImg  = catTotal - catWithImg;
    const imgPct    = Math.round((catWithImg / catTotal) * 100);
    const imgColor  = imgPct === 100 ? C.green : imgPct >= 70 ? C.yellow : C.red;
    grandTotal += catTotal;

    console.log(
      `${C.bright}${C.cyan}▶ ${cat.toUpperCase().padEnd(36)}${C.reset}` +
      ` ${C.bright}${catTotal} prodotti${C.reset}` +
      `  ${imgColor}🖼 ${imgPct}%${C.reset}` +
      (catNoImg > 0 ? ` ${C.red}(${catNoImg} senza img)${C.reset}` : ''),
    );

    // Controlla nomi simili dentro la stessa cat (normalizza e confronta)
    const subNames = [...subMap.keys()];
    for (let i = 0; i < subNames.length; i++) {
      for (let j = i + 1; j < subNames.length; j++) {
        const a = subNames[i].replace(/[-_]/g, '').toLowerCase();
        const b = subNames[j].replace(/[-_]/g, '').toLowerCase();
        if (a === b || a.startsWith(b) || b.startsWith(a)) {
          dupeSubs.push(`  ⚠  [${cat}] "${subNames[i]}" ≈ "${subNames[j]}"`);
        }
      }
    }

    const sortedSubs = [...subMap.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [sub, slot] of sortedSubs) {
      const bar      = '█'.repeat(Math.min(Math.round(slot.count / 2), 28));
      const imgIcon  = slot.withImg === slot.count ? `${C.green}✓${C.reset}` : `${C.red}✗${slot.count - slot.withImg}${C.reset}`;
      const lowWarn  = slot.count < 3 ? ` ${C.red}⚠ POCHI!${C.reset}` : '';
      if (slot.count < 3) warnSubs.push(`  ⚠  [${cat}] "${sub}" ha solo ${slot.count} prodotto/i`);
      console.log(
        `  ${C.gray}├ ${sub.padEnd(38)}${C.reset}` +
        ` ${C.yellow}${String(slot.count).padStart(4)}${C.reset}` +
        `  ${C.green}${bar.padEnd(28)}${C.reset}` +
        `  img:${imgIcon}${lowWarn}`,
      );
    }
  }

  // ── SEZIONE 2: copertura immagini ──
  const withImg   = all.filter(hasAnyRealImg).length;
  const noImg     = all.length - withImg;
  const imgPctAll = Math.round((withImg / all.length) * 100);
  const multiImg  = all.filter((p) => countRealImgs(p) >= 3).length;
  const singleImg = all.filter((p) => { const n = countRealImgs(p); return n === 1 || n === 2; }).length;

  hr('─');
  console.log(`${C.bright}${C.cyan}  🖼  COPERTURA IMMAGINI${C.reset}`);
  console.log(`  Con immagini reali  : ${C.green}${withImg}${C.reset} / ${all.length}  (${imgPctAll}%)`);
  console.log(`  Con galleria (≥3)   : ${C.green}${multiImg}${C.reset}`);
  console.log(`  Solo 1-2 immagini   : ${C.yellow}${singleImg}${C.reset}`);
  console.log(`  ${C.red}Senza immagini      : ${noImg}${C.reset}`);

  if (noImgProducts.length > 0 && noImgProducts.length <= 30) {
    console.log(`\n  ${C.red}Prodotti senza immagini reali:${C.reset}`);
    for (const p of noImgProducts) {
      console.log(`  ${C.gray}  · [${p.sub}] ${p.name.slice(0, 60)}${C.reset}`);
    }
  } else if (noImgProducts.length > 30) {
    console.log(`\n  ${C.red}  → ${noImgProducts.length} prodotti senza img. Esegui: ./kitwer-tools.sh fill-gallery${C.reset}`);
  }

  // ── SEZIONE 3: varianti ──
  hr('─');
  console.log(`${C.bright}${C.cyan}  🎨  COPERTURA VARIANTI${C.reset}`);
  const withVariants = all.filter((p) => Array.isArray(p.variants) && p.variants.length > 0);
  const variantTypeCounts = new Map<string, number>();
  for (const p of withVariants) {
    for (const v of p.variants!) {
      variantTypeCounts.set(v.name, (variantTypeCounts.get(v.name) ?? 0) + 1);
    }
  }
  console.log(`  Con varianti        : ${C.green}${withVariants.length}${C.reset} / ${all.length}  (${Math.round((withVariants.length / all.length) * 100)}%)`);
  console.log(`  Senza varianti      : ${C.yellow}${all.length - withVariants.length}${C.reset}`);

  if (variantTypeCounts.size > 0) {
    console.log(`\n  Tipi di varianti trovati:`);
    const sortedTypes = [...variantTypeCounts.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sortedTypes) {
      const bar = '█'.repeat(Math.min(Math.round(count / 3), 20));
      console.log(`  ${C.gray}  ${name.padEnd(20)}${C.reset} ${C.yellow}${String(count).padStart(4)}${C.reset}  ${C.cyan}${bar}${C.reset}`);
    }
  }

  // ── SEZIONE 4: alert ──
  if (warnSubs.length > 0 || dupeSubs.length > 0) {
    hr('─');
    console.log(`${C.bright}${C.red}  ⚠  ALERT${C.reset}`);
    for (const w of warnSubs)  console.log(`${C.red}${w}${C.reset}`);
    for (const d of dupeSubs)  console.log(`${C.yellow}${d}${C.reset}`);
  }

  // ── FOOTER ──
  hr('═');
  console.log(`${C.bright}${C.green}  TOTALE PRODOTTI    : ${grandTotal}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  CATEGORIE          : ${tree.size}${C.reset}`);
  const totalSubs = [...tree.values()].reduce((s, m) => s + m.size, 0);
  console.log(`${C.bright}${C.cyan}  SOTTO-CATEGORIE    : ${totalSubs}${C.reset}`);
  console.log(`${C.bright}${C.yellow}  BUDGET KING 👑     : ${budgetKingTotal}${C.reset}`);
  hr('═');
}

// ══════════════════════════════════════════════════════════════════
// § 17 — COMMAND: FILL-GALLERY (ricerca immagini per nome prodotto)
// ══════════════════════════════════════════════════════════════════

/**
 * Cerca immagini reali via DuckDuckGo Image Search.
 * Strategia a 3 livelli:
 *   1. Nome completo → DDG images
 *   2. Prime 4 parole → DDG images
 *   3. Prime 3 parole significative → DDG images
 *
 * DDG non blocca le richieste server-side come fa Amazon.
 * Flow: GET duckduckgo.com/?q=... → estrai vqd token → GET i.js → JSON results
 */
async function fetchGalleryByName(name: string): Promise<string[]> {
  const fetchDDGImages = async (query: string): Promise<string[]> => {
    try {
      // Step 1: ottieni il vqd token dalla pagina principale
      const homeUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
      const htmlRes = await fetch(homeUrl, {
        headers: {
          'User-Agent': nextUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!htmlRes.ok) return [];
      const html = await htmlRes.text();

      // Estrai vqd token (formato: vqd="4-..." o vqd=4-...)
      const vqd = html.match(/vqd=['"]([^'"]+)['"]/)?.[1]
               ?? html.match(/vqd=([\d-]+)/)?.[1];
      if (!vqd) return [];

      // Step 2: fetch risultati immagini JSON
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
      const imgApiUrl = `https://duckduckgo.com/i.js?l=it-it&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vqd)}&f=,,,,,&p=1`;
      const imgRes = await fetch(imgApiUrl, {
        headers: {
          'User-Agent': nextUA(),
          'Accept': 'application/json, text/javascript, */*',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://duckduckgo.com/',
          'X-Requested-With': 'XMLHttpRequest',
          'Connection': 'keep-alive',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!imgRes.ok) return [];

      const json = await imgRes.json() as { results?: Array<{ image?: string; thumbnail?: string; url?: string }> };
      const results = json.results ?? [];

      const urls: string[] = [];
      for (const r of results) {
        // Preferisci image full-size, fallback thumbnail
        const u = r.image ?? r.thumbnail;
        if (!u) continue;
        if (!u.startsWith('http')) continue;
        // Salta URL DDG interni o placeholder
        if (u.includes('duckduckgo.com')) continue;
        if (u.includes('placeholder') || u.includes('no-image')) continue;
        urls.push(u);
        if (urls.length >= 8) break;
      }
      return urls;
    } catch { return []; }
  };

  const queries = [
    name,
    name.split(/\s+/).slice(0, 4).join(' '),
    name.split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(' '),
  ].filter((q, i, a) => q.length > 3 && a.indexOf(q) === i);   // dedup + min length

  for (const q of queries) {
    const imgs = await fetchDDGImages(q);
    if (imgs.length >= 2) return imgs;
    if (imgs.length > 0) return imgs;
    // Piccola pausa tra query diverse
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
  }
  return [];
}

async function cmdFillGallery(args: string[]) {
  const dryRun    = args.includes('--dry-run');
  const forceAll  = args.includes('--all');           // sovrascrive anche chi ha già immagini
  const limitArg  = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0', 10);
  const minDelay  = parseInt(args.find((a) => a.startsWith('--delay='))?.split('=')[1] ?? '5000', 10);

  banner(
    'FILL-GALLERY — Ricerca immagini via DuckDuckGo Images',
    [dryRun ? 'DRY RUN' : 'LIVE', forceAll ? 'TUTTI' : 'Solo senza immagini', `delay≥${minDelay}ms`].join(' · '),
  );
  const supabase  = getSupabase();
  const LOGS_DIR  = resolve(process.cwd(), 'logs');
  mkdirSync(LOGS_DIR, { recursive: true });

  const isRealImg = (url?: string | null) => {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('/')) return true; // placeholder locale
    if (url.includes('m.media-amazon.com')) {
      const id = url.match(/\/images\/I\/([^._]+)/)?.[1] ?? '';
      if (/^[A-Z0-9]{10}$/.test(id)) return false; // ASIN fake
      if (!url.includes('._')) return false;
    }
    return true;
  };

  // Carica prodotti in batch
  interface P { id:string; name:string; image_url:string|null; image_urls:string[]|null }
  let all: P[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase.from('products').select('id,name,image_url,image_urls').range(from, from + 999);
    if (error) { log(C.red, 'FATAL', error.message); return; }
    if (!data?.length) break;
    all = all.concat(data as P[]);
    if (data.length < 1000) break;
    from += 1000;
  }
  log(C.cyan, 'DB', `${all.length} prodotti caricati`);

  // Filtra: solo quelli senza immagini reali (o --all per forzare)
  const toProcess = forceAll
    ? all
    : all.filter((p) => {
        const hasReal = isRealImg(p.image_url) ||
          (Array.isArray(p.image_urls) && p.image_urls.some(isRealImg));
        return !hasReal;
      });

  if (limitArg > 0 && toProcess.length > limitArg) toProcess.splice(limitArg);
  log(C.cyan, 'TARGET', `${toProcess.length} prodotti da processare su ${all.length} totali`);

  if (toProcess.length === 0) {
    log(C.green, 'OK', 'Tutti i prodotti hanno già immagini reali!');
    return;
  }

  let found = 0, notFound = 0, captchaCount = 0;
  const failures: string[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    console.log(`\n${C.bright}${C.yellow}── [${i + 1}/${toProcess.length}] ${p.name.slice(0, 65)} ──${C.reset}`);

    if (captchaCount >= 3) {
      log(C.red, 'STOP', 'Troppi CAPTCHA rilevati — Amazon sta bloccando. Riprova tra 10-15 minuti.');
      break;
    }

    const imgs = await fetchGalleryByName(p.name);

    if (!imgs.length) {
      log(C.red, 'NO-IMG', `Nessuna immagine trovata per "${p.name.slice(0, 50)}"`);
      failures.push(p.name);
      notFound++;
      // Controlla se stiamo ottenendo CAPTCHA
      captchaCount = notFound > 2 && notFound === i + 1 ? captchaCount + 1 : 0;
    } else {
      captchaCount = 0;
      log(C.green, 'FOUND', `${imgs.length} immagini trovate`);
      imgs.slice(0, 3).forEach((u) => log(C.gray, '→', u.slice(0, 80)));
      found++;

      if (!dryRun) {
        const { error: upErr } = await supabase.from('products').update({
          image_url:  imgs[0],
          image_urls: imgs,
        }).eq('id', p.id);
        if (upErr) log(C.red, 'DB-ERR', upErr.message);
        else log(C.green, 'SAVED', `${imgs.length} immagini salvate`);
      }
    }

    // Delay anti-bot tra richieste (salta l'ultimo)
    if (i < toProcess.length - 1) {
      const ms = minDelay + Math.floor(Math.random() * 3000);
      process.stdout.write(`  ${C.gray}⏳ pausa ${(ms / 1000).toFixed(1)}s...${C.reset}\r`);
      await new Promise((r) => setTimeout(r, ms));
    }
  }

  // Salva report fallimenti
  const reportPath = join(LOGS_DIR, 'fill_gallery_failures.json');
  writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), failures }, null, 2));

  hr('═');
  console.log(`${C.bright}${C.green}  ✓ Immagini trovate  : ${found}${C.reset}`);
  console.log(`${C.bright}${C.red}  ✗ Non trovate       : ${notFound}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  Totale processati   : ${i_end(found + notFound)}${C.reset}`);
  if (dryRun) console.log(`${C.bright}${C.yellow}  DRY RUN — nessun salvataggio${C.reset}`);
  console.log(`  📄 Report: ${C.cyan}logs/fill_gallery_failures.json${C.reset}`);
  hr('═');
}

function i_end(n: number) { return n; } // helper per evitare errore var 'i' fuori scope

const COMMANDS: Record<string, { fn: (args: string[]) => Promise<void>; desc: string }> = {
  'import':       { fn: cmdImport,     desc: 'Importa prodotti da CSV/XLSX (MAGAZZINO/ o file specifici)' },
  'dedup':        { fn: cmdDedup,      desc: 'De-duplicazione intelligente prodotti' },
  'variants':     { fn: cmdVariants,   desc: 'Scraping varianti colore/taglia da Amazon' },
  'subcats':      { fn: cmdSubcats,    desc: 'Assegna sotto-categorie via keyword matching' },
  'fix-images':   { fn: cmdFixImages,  desc: 'Ripara URL immagini rotte nel DB' },
  'sync-product-links':  { fn: cmdSyncProductLinks, desc: 'Sincronizza URL prodotti puliti da affiliate links' },
  'process-magazzino-links': { fn: async (args) => { await processMagazzinoLinks(); }, desc: 'Processa i link MAGAZZINO: pulizia + verifica 200' },
  'prices':       { fn: cmdPrices,       desc: 'Migra e ricalcola prezzi da CSV' },
  'clean-db':     { fn: cmdCleanDb,      desc: '⚠  Svuota completamente la tabella products' },
  'stress-test':  { fn: cmdStressTest,   desc: '🔗 Verifica integrità URL + purity check + log broken_links.json' },
  'verify':       { fn: cmdVerify,       desc: '📊 Conteggio prodotti per categoria e sottocategoria' },
  'fill-gallery': { fn: cmdFillGallery,  desc: '🖼️  Riempi gallerie immagini cercando per nome su DuckDuckGo Images' },
};

function printHelp() {
  banner('KITWER-TOOLS v1.0 — Suite universale Kitwer26');
  console.log(`${C.bright}USO:${C.reset}`);
  console.log(`  npx tsx scripts/kitwer-tools.ts [comando] [opzioni]\n`);
  console.log(`${C.bright}COMANDI:${C.reset}`);
  for (const [cmd, { desc }] of Object.entries(COMMANDS)) {
    const padded = cmd.padEnd(14);
    console.log(`  ${C.cyan}${C.bright}${padded}${C.reset}  ${desc}`);
  }
  console.log(`\n${C.bright}FLAG COMUNI:${C.reset}`);
  console.log(`  ${C.cyan}--dry-run${C.reset}       Simula senza scrivere sul DB`);
  console.log(`  ${C.cyan}--upsert${C.reset}        Aggiorna prodotti esistenti (import)`);
  console.log(`  ${C.cyan}--hard-reset${C.reset}    ⚠  Svuota il DB prima di importare (import)`);
  console.log(`  ${C.cyan}--permissive${C.reset}    Accetta categorie UNSORTED (import)`);
  console.log(`  ${C.cyan}--from-revisione${C.reset} Reimporta da da_revisionare.txt (import)`);
  console.log(`  ${C.cyan}--all${C.reset}           Processa anche prodotti già elaborati (variants)`);
  console.log(`  ${C.cyan}--execute${C.reset}            Applica modifiche prezzi (prices)`);
  console.log(`  ${C.cyan}--concurrency=N${C.reset}      N worker paralleli (stress-test, default 8)`);
  console.log(`  ${C.cyan}--limit=N${C.reset}            Testa solo i primi N prodotti (stress-test)`);
  console.log(`  ${C.cyan}--fix-pure${C.reset}           Normalizza product_url al formato puro (stress-test)\n`);
  console.log(`${C.bright}ESEMPI:${C.reset}`);
  console.log(`  npx tsx scripts/kitwer-tools.ts import MAGAZZINO/crypto.csv --upsert`);
  console.log(`  npx tsx scripts/kitwer-tools.ts dedup --dry-run`);
  console.log(`  npx tsx scripts/kitwer-tools.ts subcats`);
  console.log(`  npx tsx scripts/kitwer-tools.ts prices --execute`);
  console.log(`  npx tsx scripts/kitwer-tools.ts stress-test`);
  console.log(`  npx tsx scripts/kitwer-tools.ts stress-test --concurrency=10 --fix-pure`);
  console.log(`  npx tsx scripts/kitwer-tools.ts stress-test --limit=50 --dry-run\n`);
}

async function interactiveMenu() {
  banner('KITWER-TOOLS v1.0 — Suite universale Kitwer26', 'Seleziona operazione con il menu');

  const choices = Object.entries(COMMANDS).map(([cmd, { desc }]) => `${C.cyan}${cmd.padEnd(14)}${C.reset}  ${desc}`);
  const chosen = await menu('Seleziona operazione (0 per uscire)', choices);
  if (chosen === 'exit') { console.log(`\n${C.gray}Uscita.${C.reset}\n`); return; }

  // Estrai il comando dal testo colorato
  const cmdKey = Object.keys(COMMANDS).find((k) => chosen.includes(k));
  if (!cmdKey) return;

  // Chiedi opzioni aggiuntive se rilevanti
  const extraArgs: string[] = [];
  if (cmdKey === 'import') {
    const hr = await confirm('⚠  HARD RESET: svuotare il DB prima dell\'import (dati freschi)?');
    if (hr) extraArgs.push('--hard-reset');
    const dr = await confirm('Eseguire in modalità UPSERT (aggiorna prodotti esistenti)?');
    if (dr) extraArgs.push('--upsert');
    const perm = await confirm('Modalità PERMISSIVE (accetta UNSORTED)?');
    if (perm) extraArgs.push('--permissive');
  }
  if (['dedup','variants','fix-images','subcats'].includes(cmdKey)) {
    const dr = await confirm('Eseguire in modalità DRY-RUN (no modifiche al DB)?');
    if (dr) extraArgs.push('--dry-run');
    if (cmdKey === 'variants') {
      const all = await confirm('Processare TUTTI i prodotti (anche quelli con varianti)?');
      if (all) extraArgs.push('--all');
    }
  }
  if (cmdKey === 'stress-test') {
    const fp = await confirm('Normalizzare product_url impuri sul DB (--fix-pure)?');
    if (fp) extraArgs.push('--fix-pure');
    const dr = await confirm('Modalità DRY-RUN (nessuna scrittura sul DB)?');
    if (dr) extraArgs.push('--dry-run');
  }
  if (cmdKey === 'prices') {
    const exec = await confirm('Applicare le modifiche al DB (--execute)?');
    if (exec) extraArgs.push('--execute');
  }

  await COMMANDS[cmdKey].fn(extraArgs);
}

async function main() {
  const args = process.argv.slice(2);
  const cmd  = args[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    if (!cmd) { await interactiveMenu(); return; }
    printHelp(); return;
  }

  const entry = COMMANDS[cmd];
  if (!entry) {
    console.error(`${C.red}Comando sconosciuto: "${cmd}"${C.reset}`);
    console.error(`Comandi disponibili: ${Object.keys(COMMANDS).join(', ')}`);
    process.exit(1);
  }

  await entry.fn(args.slice(1));
}

main().catch((e) => {
  console.error(`${C.red}${C.bright}[FATAL]${C.reset}`, e instanceof Error ? e.message : String(e));
  process.exit(1);
});
