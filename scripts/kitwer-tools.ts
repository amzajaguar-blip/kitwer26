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
 * ║    check-links → Verifica integrità link affiliazione        ║
 * ║    prices     → Migra/ricalcola prezzi da CSV                ║
 * ║    clean-db   → ⚠ Svuota tabella products (PERICOLOSO)       ║
 * ║                                                              ║
 * ║  Uso:                                                        ║
 * ║    npx tsx scripts/kitwer-tools.ts                (menu)     ║
 * ║    npx tsx scripts/kitwer-tools.ts import         (diretto)  ║
 * ║    npx tsx scripts/kitwer-tools.ts import --upsert           ║
 * ║    npx tsx scripts/kitwer-tools.ts dedup --dry-run           ║
 * ║    npx tsx scripts/kitwer-tools.ts variants --all            ║
 * ║    npx tsx scripts/kitwer-tools.ts subcats                   ║
 * ║    npx tsx scripts/kitwer-tools.ts fix-images                ║
 * ║    npx tsx scripts/kitwer-tools.ts check-links               ║
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
  const fallback = `https://m.media-amazon.com/images/I/${asin}.jpg`;
  try {
    const res = await fetch(`https://www.amazon.it/dp/${asin}/`, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [fallback];
    const html = await res.text();

    const hiRes = [...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g)];
    if (hiRes.length > 0) return [...new Set(hiRes.map((m) => m[1]))];

    const large = [...html.matchAll(/"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g)];
    if (large.length > 0) return [...new Set(large.map((m) => m[1]))];

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

interface Variant { name: string; values: string[]; images?: Record<string, string> }

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

const NAME_ALIASES     = ['nome_prodotto','nome prodotto','nome','product_name','product name','prodotto','name'];
const CATEGORY_ALIASES = ['categoria','category'];
const PRICE_ALIASES    = ['prezzo (€)','prezzo_eur','prezzo_usd','estimated_price_eur','prezzo_stimato_eur','price','prezzo','price €','price eur','price usd'];
const ASIN_ALIASES     = ['amazon_asin','asin_amazon','asin amazon','asin'];
const LINK_ALIASES     = ['link_esempio_amazon.it','link affiliazione (esempio)','link_affiliazione_(esempio)','link affiliazione','link_affiliazione','link_esempio','link','amazon link','amazon_link'];

interface ColMap { nameIdx:number; categoryIdx:number; priceIdx:number; asinIdx:number; linkIdx:number }

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
  return { nameIdx: find(NAME_ALIASES), categoryIdx: find(CATEGORY_ALIASES), priceIdx: find(PRICE_ALIASES), asinIdx: find(ASIN_ALIASES), linkIdx: find(LINK_ALIASES) };
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
  const f: string[] = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { f.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  f.push(cur.trim()); return f;
}

interface CsvProduct { name:string; price:number|null; category:string; asin:string|null; currency:'EUR'|'USD'|'UNKNOWN' }

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
    const category = (cols[map.categoryIdx] ?? '').trim();
    if (!name || PLACEHOLDER.test(name)) continue;
    const rawPrice = map.priceIdx !== -1 ? (cols[map.priceIdx] ?? '').trim() : '';
    const price = rawPrice !== '' ? parseFloat(rawPrice) : null;
    const rawAsin = map.asinIdx !== -1 ? (cols[map.asinIdx] ?? '').trim() : '';
    const rawLink = map.linkIdx !== -1 ? (cols[map.linkIdx] ?? '').trim() : '';
    let asin: string | null = ASIN_RE.test(rawAsin) ? rawAsin.toUpperCase() : extractAsinFromUrl(rawAsin);
    if (!asin && rawLink) asin = extractAsinFromUrl(rawLink);
    results.push({ name, price, category, asin, currency });
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
      const category = (row[map.categoryIdx] ?? '').toString().trim();
      if (!name || PLACEHOLDER.test(name)) continue;
      const rawPrice = map.priceIdx !== -1 ? (row[map.priceIdx] ?? '').toString().trim() : '';
      const price = rawPrice !== '' ? parseFloat(rawPrice.replace(',', '.')) : null;
      const rawAsin = map.asinIdx !== -1 ? (row[map.asinIdx] ?? '').toString().trim() : '';
      const rawLink = map.linkIdx !== -1 ? (row[map.linkIdx] ?? '').toString().trim() : '';
      let asin: string | null = ASIN_RE.test(rawAsin) ? rawAsin.toUpperCase() : extractAsinFromUrl(rawAsin);
      if (!asin && rawLink) asin = extractAsinFromUrl(rawLink);
      results.push({ name, price, category, asin, currency });
    }
    return results;
  } catch (e) { log(C.red, 'XLSX', String(e)); return []; }
}

// ══════════════════════════════════════════════════════════════════
// § 6 — SHARED: CATEGORY CLASSIFIER
// ══════════════════════════════════════════════════════════════════

const CATEGORY_MAP: Record<string, string> = {
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
  'vr':'trading-gaming-desk-accessories-premium',
  'quest':'trading-gaming-desk-accessories-premium',
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
};

const KNOWN_CATS = new Set([
  'hardware-crypto-wallets','tactical-power-grid','comms-security-shield',
  'sim-racing-accessories-premium','trading-gaming-desk-accessories-premium',
  'survival-edc-tech','Smart Security','Tactical Power','PC Hardware',
]);

const FILE_CAT_OVERRIDES: Record<string, string> = {
  'smart_security.csv':'Smart Security',
  'tactila power.csv':'Tactical Power',
  'pc_hardwer.csv':'PC Hardware',
};

function classifyCategory(name: string, csvCat = '', filename = ''): string {
  const override = FILE_CAT_OVERRIDES[filename.toLowerCase()];
  if (override) return override;
  const lower = name.toLowerCase();
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(kw)) return cat;
  }
  const csvL = csvCat.toLowerCase().trim();
  if (csvL && KNOWN_CATS.has(csvCat.trim())) return csvCat.trim();
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (csvL.includes(kw)) return cat;
  }
  const fileL = filename.toLowerCase().replace(/[-_]/g, ' ').replace(/\.csv$/, '');
  for (const [kw, cat] of Object.entries(CATEGORY_MAP)) {
    if (fileL.includes(kw)) return cat;
  }
  return 'UNSORTED';
}

// ══════════════════════════════════════════════════════════════════
// § 7 — COMMAND: IMPORT (auto-importer)
// ══════════════════════════════════════════════════════════════════

interface ProductRow {
  name:string; price:number; category:string; description:string;
  image_url:string; image_urls:string[]; affiliate_url:string;
  is_price_pending:boolean; variants:Variant[];
}

async function cmdImport(args: string[]) {
  const permissive   = args.includes('--permissive');
  const upsertMode   = args.includes('--upsert');
  const fromRevisione = args.includes('--from-revisione');
  const AFFILIATE_TAG  = 'kitwer26-21';
  const MAGAZZINO_DIR  = resolve(process.cwd(), 'MAGAZZINO');
  const OUTPUT_DIR     = resolve(process.cwd(), 'output');
  const OUTPUT_PATH    = join(OUTPUT_DIR, 'import_finale.json');
  const REVISIONE_PATH = resolve(process.cwd(), 'da_revisionare.txt');

  banner('AUTO-IMPORTER — Universal CSV Importer', permissive ? 'PERMISSIVE MODE' : 'STRICT MODE');
  const supabase = getSupabase();

  // Ensure table/columns
  const { error: connErr } = await supabase.from('products').select('id').limit(1);
  if (connErr && !connErr.message.includes('does not exist')) {
    log(C.red, 'FATAL', `Connessione Supabase: ${connErr.message}`); return;
  }
  log(C.green, 'DB', 'Connesso a Supabase');

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
  const rejectMap = new Map<string, number>();
  const trackRej = (n: string, link: string, reason: string) => {
    appendRevisione(n, link, reason);
    rejectMap.set(reason, (rejectMap.get(reason) ?? 0) + 1);
    revisione++;
  };

  const processProduct = async (
    name: string, price: number | null, category: string,
    asin: string | null, currency: 'EUR'|'USD'|'UNKNOWN', filename: string, idx: number, total: number
  ) => {
    console.log(`\n${C.bright}${C.yellow}── [${idx}/${total}] ${name} ──${C.reset}`);
    try {
      const { exists } = await findExisting(name);
      if (exists && !upsertMode) { log(C.blue, 'SKIP', `"${name}" già nel DB`); skipped++; return; }
      if (exists && upsertMode) log(C.cyan, 'UPSERT', `"${name}" già nel DB → aggiornamento`);

      const isPricePending = price === null || isNaN(price) || price <= 0;
      const finalPrice     = isPricePending ? 0 : applyKitwerFormula(price!, currency);

      const finalCat = classifyCategory(name, category, filename);
      if (finalCat === 'UNSORTED' && !permissive) {
        const link = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;
        trackRej(name, link, 'Categoria sconosciuta');
        log(C.red, 'SCARTATO', `"${name}" → categoria sconosciuta`); return;
      }
      log(C.green, 'CAT', `"${name}" → ${finalCat}`);

      let finalAsin = asin ?? extractAsinFromText(name) ?? await findAsin(name);
      if (!finalAsin) {
        const link = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;
        trackRej(name, link, 'ASIN non trovato');
        log(C.red, 'SCARTATO', `"${name}" → ASIN non trovato`); return;
      }

      const affiliate_url = `https://www.amazon.it/dp/${finalAsin}/?tag=${AFFILIATE_TAG}`;
      const gallery = await fetchProductGallery(finalAsin);
      if (gallery.length === 1 && gallery[0].endsWith(`${finalAsin}.jpg`)) {
        const si = await searchProductImage(name);
        if (si) gallery[0] = si;
        else {
          trackRej(name, affiliate_url, 'Immagine non trovata');
          log(C.red, 'SCARTATO', `"${name}" → nessuna immagine`); return;
        }
      }

      const variants    = await scrapeVariants(finalAsin);
      const description = await generateDescription(name, finalCat);

      const row: ProductRow = {
        name, price: finalPrice, category: finalCat, description,
        image_url: gallery[0], image_urls: gallery,
        affiliate_url, is_price_pending: isPricePending, variants,
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
      await processProduct(name, null, '', asin, 'UNKNOWN', '', i + 1, entries.length);
      if (i < entries.length - 1) await delay(4000, 7000);
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

    for (const { filename, filePath, isExcel } of entries) {
      hr('═', 58, C.blue);
      log(C.blue, 'FILE', filename);
      hr('═', 58, C.blue);
      const products = isExcel ? parseExcelFile(filePath) : parseCsvContent(readFileSync(filePath, 'utf-8'), filename);
      if (products.length === 0) { log(C.yellow, 'FILE', 'Nessuna riga valida — salto'); continue; }
      for (let i = 0; i < products.length; i++) {
        const { name, price, category, asin, currency } = products[i];
        await processProduct(name, price, category, asin, currency, filename, i + 1, products.length);
        if (i < products.length - 1) await delay(4000, 7000);
      }
    }
  }

  appendFileSync(OUTPUT_PATH, '\n]\n', 'utf-8');

  // Riepilogo
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
  const dryRun = args.includes('--dry-run');
  banner('DEDUP-PRODUCTS — De-duplicazione intelligente', dryRun ? 'DRY RUN (no modifiche)' : 'LIVE');
  const supabase = getSupabase();

  interface P { id:string; name:string; description:string|null; image_url:string|null; image_urls:string[]|null; affiliate_url:string|null; category:string|null; price:number|null; variants:Variant[]|null; slug:string|null }

  const { data: products, error } = await supabase
    .from('products').select('id,name,description,image_url,image_urls,affiliate_url,category,price,variants,slug').order('name');
  if (error) { log(C.red, 'FATAL', error.message); return; }
  if (!products?.length) { log(C.yellow, 'INFO', 'Nessun prodotto'); return; }
  log(C.cyan, 'SCAN', `${products.length} prodotti caricati`);

  const makeSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80);

  const mergeDescs = (descs: string[]) => {
    const clean = descs.map((d) => d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (clean.length <= 1) return clean[0] ?? '';
    const seen = new Set<string>(); const uniq: string[] = [];
    for (const s of clean.flatMap((d) => d.split(/(?<=[.!?])\s+/).filter((s) => s.length > 10))) {
      const k = s.toLowerCase().slice(0, 40);
      if (!seen.has(k)) { seen.add(k); uniq.push(s); }
    }
    return uniq.join(' ');
  };

  const groups = new Map<string, P[]>();
  for (const p of products as P[]) {
    const key = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : (p.image_url ?? `__noid_${p.id}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  const dups = [...groups.values()].filter((g) => g.length > 1);
  log(C.yellow, 'DUPLICATI', `${dups.length} gruppi trovati`);
  if (dups.length === 0) { log(C.green, 'OK', 'Nessun duplicato!'); return; }

  let merged = 0, deleted = 0, errored = 0;
  for (const group of dups) {
    const sorted = [...group].sort((a, b) => b.name.length - a.name.length);
    const master = sorted[0], dupItems = sorted.slice(1);
    console.log(`\n${C.bright}${C.yellow}── GRUPPO (${group.length}) ──${C.reset}`);
    log(C.green, 'MASTER', `"${master.name}"`);
    dupItems.forEach((d) => log(C.gray, 'DUP', `"${d.name}"`));

    const titleVals = [master.name, ...dupItems.map((d) => d.name).filter((n) => n !== master.name)];
    const existVars = Array.isArray(master.variants) ? master.variants : [];
    let newVars = [...existVars];
    if (titleVals.length > 1) {
      const idx = newVars.findIndex((v) => v.name === 'Versione');
      if (idx >= 0) newVars[idx] = { ...newVars[idx], values: [...new Set([...newVars[idx].values, ...titleVals])] };
      else newVars.push({ name: 'Versione', values: titleVals });
    }

    const mergedDesc = mergeDescs([master.description ?? '', ...dupItems.map((d) => d.description ?? '')]);
    const allUrls = [...new Set([...(master.image_urls ?? []), ...dupItems.flatMap((d) => d.image_urls ?? [])].filter(Boolean))];
    const baseSlug = makeSlug(master.name);
    const { data: sc } = await supabase.from('products').select('id').eq('slug', baseSlug).neq('id', master.id).maybeSingle();
    const finalSlug = sc ? `${baseSlug}-${String(master.id).slice(0, 6)}` : baseSlug;

    if (!dryRun) {
      const { error: uErr } = await supabase.from('products').update({
        variants: newVars, description: mergedDesc || master.description,
        image_urls: allUrls, image_url: allUrls[0] ?? master.image_url, slug: finalSlug,
      }).eq('id', master.id);
      if (uErr) { log(C.red, 'ERR', uErr.message); errored++; continue; }
      const { error: dErr } = await supabase.from('products').delete().in('id', dupItems.map((d) => d.id));
      if (dErr) { log(C.red, 'ERR', dErr.message); errored++; continue; }
      deleted += dupItems.length;
    } else {
      log(C.yellow, 'DRY', `Avrebbe eliminato ${dupItems.length} duplicati`);
    }
    merged++;
  }

  hr();
  console.log(`${C.bright}${C.green}  Gruppi processati : ${merged}${C.reset}`);
  console.log(`${C.bright}${C.red}  Record eliminati  : ${deleted}${C.reset}`);
  if (errored) console.log(`${C.bright}${C.yellow}  Errori           : ${errored}${C.reset}`);
  if (dryRun) console.log(`${C.bright}${C.yellow}  DRY RUN — nessuna modifica${C.reset}`);
  hr();
}

// ══════════════════════════════════════════════════════════════════
// § 9 — COMMAND: VARIANTS
// ══════════════════════════════════════════════════════════════════

async function cmdVariants(args: string[]) {
  const allMode = args.includes('--all');
  const dryRun  = args.includes('--dry-run');
  banner('POPULATE-VARIANTS — Scraping varianti da Amazon', dryRun ? 'DRY RUN' : allMode ? 'ALL (sovrascrive)' : 'Solo prodotti senza varianti');
  const supabase = getSupabase();

  const { data, error } = await supabase.from('products').select('id,name,affiliate_url,variants');
  if (error) { log(C.red, 'FATAL', error.message); return; }
  if (!data?.length) { log(C.yellow, 'INFO', 'Nessun prodotto'); return; }

  const extractAsin = (url: string) => url?.match(/\/dp\/([A-Z0-9]{10})(?:[/?#]|$)/i)?.[1]?.toUpperCase() ?? null;

  const toProcess = allMode
    ? data.filter((p) => p.affiliate_url)
    : data.filter((p) => p.affiliate_url && (!p.variants || (p.variants as Variant[]).length === 0));

  log(C.cyan, 'SCAN', `${toProcess.length} da processare su ${data.length} totali`);
  let done = 0, noVar = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    console.log(`\n${C.bright}${C.yellow}── [${i+1}/${toProcess.length}] ${p.name.slice(0, 60)} ──${C.reset}`);
    const asin = extractAsin(p.affiliate_url);
    if (!asin) { log(C.yellow, 'SKIP', 'ASIN non estraibile'); noVar++; continue; }
    const variants = await scrapeVariants(asin);
    if (!variants.length) { log(C.gray, 'NO-VAR', 'Nessuna variante trovata'); noVar++; }
    else {
      const imgCount = variants.reduce((s, v) => s + Object.keys(v.images ?? {}).length, 0);
      log(C.green, 'OK', `${variants.map((v) => `${v.name}(${v.values.length})`).join(', ')} | ${imgCount} img`);
      if (!dryRun) {
        const { error: upErr } = await supabase.from('products').update({ variants }).eq('id', p.id);
        if (upErr) log(C.red, 'DB ERR', upErr.message); else done++;
      } else done++;
    }
    if (i < toProcess.length - 1) await delay(4000, 7000);
  }

  hr();
  console.log(`${C.bright}${C.green}  Salvati        : ${done}${C.reset}`);
  console.log(`${C.bright}${C.yellow}  Senza varianti : ${noVar}${C.reset}`);
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

  const updates: Array<{id:string;sub_category:string}> = [];
  const stats: Record<string, number> = {};
  let unmatched = 0;

  for (const p of all) {
    const sub = assignSubCat(p.category ?? '', p.name ?? '', p.description ?? '');
    if (sub) { updates.push({ id: p.id, sub_category: sub }); stats[`${p.category} → ${sub}`] = (stats[`${p.category} → ${sub}`] ?? 0) + 1; }
    else unmatched++;
  }

  log(C.cyan, 'CLASSIFY', `Assegnate: ${updates.length}  |  Senza match: ${unmatched}`);

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
  console.log(`  ${C.yellow}${String(unmatched).padStart(4)}${C.reset}  senza sub_category`);
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

  const { data, error } = await supabase.from('products').select('id,name,image_url,image_urls,affiliate_url');
  if (error) { log(C.red, 'FATAL', error.message); return; }
  if (!data?.length) { log(C.yellow, 'DB', 'Nessun prodotto'); return; }

  const broken = (data as Array<{id:string;name:string;image_url:string;image_urls:string[]|null;affiliate_url:string}>)
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
    const asin = extractAsinFromUrl(p.affiliate_url ?? '');
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
// § 12 — COMMAND: CHECK-LINKS
// ══════════════════════════════════════════════════════════════════

async function cmdCheckLinks(_args: string[]) {
  banner('LINK-CHECKER — Verifica integrità affiliate links');
  const supabase = getSupabase();
  const OUTPUT = resolve(process.cwd(), 'link_da_sostituire.txt');
  const TODAY  = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.from('products').select('id,name,affiliate_url,active').not('affiliate_url','is',null);
  if (error) { log(C.red, 'FATAL', error.message); return; }
  const products = (data ?? []) as Array<{id:string;name:string;affiliate_url:string|null;active:boolean|null}>;
  log(C.cyan, 'SCAN', `${products.length} prodotti con affiliate_url`);
  if (products.length === 0) return;

  const checkUrl = async (url: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10_000);
    try {
      let res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.status === 405) res = await fetch(url, { method: 'GET', signal: ctrl.signal, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      return { status: res.status, ok: res.ok };
    } catch (e) { return { status: null, ok: false, error: String(e).includes('abort') ? 'Timeout' : String(e) }; }
    finally { clearTimeout(t); }
  };

  const results: Array<{p:{id:string;name:string;affiliate_url:string|null;active:boolean|null};ok:boolean;status:number|null;err?:string}> = [];
  const queue = [...products];
  const CONC = 5;
  const worker = async () => {
    while (queue.length) {
      const p = queue.shift()!;
      const r = await checkUrl(p.affiliate_url!);
      results.push({ p, ok: r.ok, status: r.status, err: 'error' in r ? r.error : undefined });
      const label = r.ok ? `${C.green}[OK ${r.status}]${C.reset}` : `${C.red}[DEAD ${r.status ?? 'ERR'}]${C.reset}`;
      console.log(`  ${label} ${p.name}`);
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));

  const dead = results.filter((r) => !r.ok);
  const alive = results.filter((r) => r.ok);

  if (dead.length > 0) {
    const deadIds = dead.map((r) => r.p.id);
    await supabase.from('products').update({ active: false }).in('id', deadIds);
    appendFileSync(OUTPUT, dead.map((r) => `[${TODAY}] ${r.p.name} | Status: ${r.status ?? r.err ?? 'ERR'} | URL: ${r.p.affiliate_url ?? 'N/A'}`).join('\n') + '\n', 'utf-8');
    log(C.red, 'DEAD', `${dead.length} link morti → active=false + link_da_sostituire.txt`);
  }

  const recovered = alive.filter((r) => r.p.active === false);
  if (recovered.length > 0) {
    await supabase.from('products').update({ active: true }).in('id', recovered.map((r) => r.p.id));
    log(C.green, 'RECOVERY', `${recovered.length} prodotti ripristinati`);
  }

  hr();
  console.log(`${C.bright}${C.green}  ✓ Attivi : ${alive.length}${C.reset}`);
  console.log(`${C.bright}${C.red}  ✗ Morti  : ${dead.length}${C.reset}`);
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
// § 15 — MAIN DISPATCHER + INTERACTIVE MENU
// ══════════════════════════════════════════════════════════════════

const COMMANDS: Record<string, { fn: (args: string[]) => Promise<void>; desc: string }> = {
  'import':       { fn: cmdImport,     desc: 'Importa prodotti da CSV/XLSX (MAGAZZINO/ o file specifici)' },
  'dedup':        { fn: cmdDedup,      desc: 'De-duplicazione intelligente prodotti' },
  'variants':     { fn: cmdVariants,   desc: 'Scraping varianti colore/taglia da Amazon' },
  'subcats':      { fn: cmdSubcats,    desc: 'Assegna sotto-categorie via keyword matching' },
  'fix-images':   { fn: cmdFixImages,  desc: 'Ripara URL immagini rotte nel DB' },
  'check-links':  { fn: cmdCheckLinks, desc: 'Verifica integrità link affiliazione' },
  'prices':       { fn: cmdPrices,     desc: 'Migra e ricalcola prezzi da CSV' },
  'clean-db':     { fn: cmdCleanDb,    desc: '⚠  Svuota completamente la tabella products' },
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
  console.log(`  ${C.cyan}--permissive${C.reset}    Accetta categorie UNSORTED (import)`);
  console.log(`  ${C.cyan}--from-revisione${C.reset} Reimporta da da_revisionare.txt (import)`);
  console.log(`  ${C.cyan}--all${C.reset}           Processa anche prodotti già elaborati (variants)`);
  console.log(`  ${C.cyan}--execute${C.reset}       Applica modifiche prezzi (prices)\n`);
  console.log(`${C.bright}ESEMPI:${C.reset}`);
  console.log(`  npx tsx scripts/kitwer-tools.ts import MAGAZZINO/crypto.csv --upsert`);
  console.log(`  npx tsx scripts/kitwer-tools.ts dedup --dry-run`);
  console.log(`  npx tsx scripts/kitwer-tools.ts subcats`);
  console.log(`  npx tsx scripts/kitwer-tools.ts prices --execute\n`);
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
