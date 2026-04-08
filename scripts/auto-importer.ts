/**
 * AUTO-IMPORTER   (Universal CSV Importer) — ⚠ STRICT MODE (default) ⚠
 *
 * Compatibile con qualsiasi CSV nella cartella MAGAZZINO/:
 *   - Mapping automatico header tramite alias multipli
 *   - Pulizia intestazioni (NFKD, zero-width chars, spazi extra)
 *   - Estrazione ASIN da URL Amazon o ricerca per nome
 *   - DeepSeek solo per prodotti NUOVI (evita duplicati e spreco token)
 *   - STRICT MODE (default): scarta qualsiasi prodotto con nome, prezzo, categoria o ASIN non validi
 *   - PERMISSIVE MODE (--permissive): consente categorie UNSORTED per import massivo
 *   - Pausa tattica anti-bot 4–7 secondi tra prodotti
 *   - Tabella riepilogo qualità a fine sessione
 *
 * Run:  npx tsx scripts/auto-importer.ts [file1.csv file2.csv ...]
 *       npx tsx scripts/auto-importer.ts --permissive       ← Modalità permissiva (consente UNSORTED)
 *       npx tsx scripts/auto-importer.ts --from-revisione   ← Reimporta da da_revisionare.txt
 *
 * Richiede in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← chiave admin (Settings → API)
 *   DEEPSEEK_API_KEY
 *
 * Per abilitare il DDL automatico, esegui UNA volta nel SQL Editor:
 *   CREATE OR REPLACE FUNCTION exec_sql(sql text) RETURNS void
 *   LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql; END; $$;
 */

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, basename, extname } from 'path';
import * as XLSX from 'xlsx';

// ──────────────────────────────────────────────
// COLORI TERMINALE
// ──────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',
  gray:    '\x1b[90m',
};

function log(color: string, tag: string, msg: string) {
  const ts = new Date().toLocaleTimeString('it-IT');
  console.log(`${C.gray}${ts}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);
}

// ──────────────────────────────────────────────
// COSTANTI
// ──────────────────────────────────────────────
const MAGAZZINO_DIR = resolve(process.cwd(), 'MAGAZZINO');
const OUTPUT_DIR    = resolve(process.cwd(), 'output');
const OUTPUT_PATH   = join(OUTPUT_DIR, 'import_finale.json');
const AFFILIATE_TAG   = 'kitwer26-21';
const UNSORTED_CAT    = 'UNSORTED';
const REVISIONE_PATH  = resolve(process.cwd(), 'da_revisionare.txt');

// ──────────────────────────────────────────────
// FORMULA KITWER & VALUTA
// ──────────────────────────────────────────────
/**
 * Tasso di cambio USD → EUR applicato prima della formula Kitwer.
 * Imposta 1.0 per conversione 1:1, oppure il tasso corrente (es. 0.92).
 */
const USD_TO_EUR_RATE = 1.0;

// ──────────────────────────────────────────────
// CATEGORY CLASSIFIER — Mappa parole chiave → slug
// ──────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  // ── hardware-crypto-wallets ────────────────────────────────
  'ledger':              'hardware-crypto-wallets',
  'trezor':              'hardware-crypto-wallets',
  'tangem':              'hardware-crypto-wallets',
  'cold storage':        'hardware-crypto-wallets',  // multi-word first
  'signing device':      'hardware-crypto-wallets',
  'signing':             'hardware-crypto-wallets',
  'mnemonic':            'hardware-crypto-wallets',
  'cryptosteel':         'hardware-crypto-wallets',
  'cobo':                'hardware-crypto-wallets',
  'bitcoin':             'hardware-crypto-wallets',
  'crypto':              'hardware-crypto-wallets',
  'wallet':              'hardware-crypto-wallets',
  'seed':                'hardware-crypto-wallets',
  // ── tactical-power-grid ───────────────────────────────────
  'portable power station': 'tactical-power-grid',  // multi-word first
  'power station':       'tactical-power-grid',
  'portable power':      'tactical-power-grid',
  'goal zero':           'tactical-power-grid',
  'power bank':          'tactical-power-grid',
  'fast charge':         'tactical-power-grid',
  'apc':                 'tactical-power-grid',
  'ups':                 'tactical-power-grid',
  'powerbank':           'tactical-power-grid',
  'bluetti':             'tactical-power-grid',
  'jackery':             'tactical-power-grid',
  'ecoflow':             'tactical-power-grid',
  'anker':               'tactical-power-grid',
  'nitecore':            'tactical-power-grid',
  'marbero':             'tactical-power-grid',
  'oukitel':             'tactical-power-grid',
  'powertraveller':      'tactical-power-grid',
  'dji':                 'tactical-power-grid',
  'batteria':            'tactical-power-grid',
  'battery':             'tactical-power-grid',
  'solare':              'tactical-power-grid',
  'solar':               'tactical-power-grid',
  'charger':             'tactical-power-grid',
  'caricatore':          'tactical-power-grid',
  // ── comms-security-shield ─────────────────────────────────
  'privacy screen':      'comms-security-shield',   // multi-word first
  'privacy filter':      'comms-security-shield',
  'security key':        'comms-security-shield',
  'signal blocking':     'comms-security-shield',
  'signal jammer':       'comms-security-shield',
  'webcam cover':        'comms-security-shield',
  'anti-glare':          'comms-security-shield',
  'antiglare':           'comms-security-shield',
  'yubikey':             'comms-security-shield',
  'yubico':              'comms-security-shield',
  'faraday':             'comms-security-shield',
  'airtag':              'comms-security-shield',
  'rfid':                'comms-security-shield',
  'privacy':             'comms-security-shield',
  'screen':              'comms-security-shield',
  'fido':                'comms-security-shield',
  'titan':               'comms-security-shield',
  'thetis':              'comms-security-shield',
  'feitian':             'comms-security-shield',
  'encrypted':           'comms-security-shield',
  // ── sim-racing-accessories-premium ────────────────────────
  'wheel stand':         'sim-racing-accessories-premium',  // multi-word first
  'driving force':       'sim-racing-accessories-premium',
  'cockpit':             'sim-racing-accessories-premium',
  'playseat':            'sim-racing-accessories-premium',
  'racing':              'sim-racing-accessories-premium',
  'shifter':             'sim-racing-accessories-premium',
  'volante':             'sim-racing-accessories-premium',
  'sim':                 'sim-racing-accessories-premium',
  'moza':                'sim-racing-accessories-premium',
  'fanatec':             'sim-racing-accessories-premium',
  'thrustmaster':        'sim-racing-accessories-premium',
  'openwheeler':         'sim-racing-accessories-premium',
  'wheel':               'sim-racing-accessories-premium',
  'pedals':              'sim-racing-accessories-premium',
  'logitech':            'sim-racing-accessories-premium',
  'next level':          'sim-racing-accessories-premium',
  'gt omega':            'sim-racing-accessories-premium',
  'playseat challenge':  'sim-racing-accessories-premium',
  'playseat trophy':     'sim-racing-accessories-premium',
  // ── trading-gaming-desk-accessories-premium ───────────────
  'gaming mouse':        'trading-gaming-desk-accessories-premium',  // multi-word first
  'laptop stand':        'trading-gaming-desk-accessories-premium',
  'cooling pad':         'trading-gaming-desk-accessories-premium',
  'monitor arm':         'trading-gaming-desk-accessories-premium',
  'monitor mount':       'trading-gaming-desk-accessories-premium',
  'gaming chair':        'trading-gaming-desk-accessories-premium',
  'mousepad':            'trading-gaming-desk-accessories-premium',
  'huanuo':              'trading-gaming-desk-accessories-premium',
  'bontec':              'trading-gaming-desk-accessories-premium',
  'chair':               'trading-gaming-desk-accessories-premium',
  'sedia':               'trading-gaming-desk-accessories-premium',
  'ergonomic':           'trading-gaming-desk-accessories-premium',
  'monitor':             'trading-gaming-desk-accessories-premium',
  'mount':               'trading-gaming-desk-accessories-premium',
  'desk':                'trading-gaming-desk-accessories-premium',
  'braccio':             'trading-gaming-desk-accessories-premium',
  'vivo':                'trading-gaming-desk-accessories-premium',
  'vr':                  'trading-gaming-desk-accessories-premium',
  'quest':               'trading-gaming-desk-accessories-premium',
  'pimax':               'trading-gaming-desk-accessories-premium',
  'valve index':         'trading-gaming-desk-accessories-premium',
  'ergotron':            'trading-gaming-desk-accessories-premium',
  'wali':                'trading-gaming-desk-accessories-premium',
  'ultrarm':             'trading-gaming-desk-accessories-premium',
  'odk':                 'trading-gaming-desk-accessories-premium',
  // ── survival-edc-tech ─────────────────────────────────────
  'credit card survival': 'survival-edc-tech',  // multi-word first
  'fire starter':        'survival-edc-tech',
  'ferro rod':           'survival-edc-tech',
  'arc lighter':         'survival-edc-tech',
  'water filter':        'survival-edc-tech',
  'multi-tool':          'survival-edc-tech',  // hyphenated variant
  'penna tattica':       'survival-edc-tech',
  'edc':                 'survival-edc-tech',
  'keychain':            'survival-edc-tech',
  'baton':               'survival-edc-tech',
  'olight':              'survival-edc-tech',
  'survival':            'survival-edc-tech',
  'leatherman':          'survival-edc-tech',
  'victorinox':          'survival-edc-tech',
  'gerber':              'survival-edc-tech',
  'streamlight':         'survival-edc-tech',
  'sog':                 'survival-edc-tech',
  'lifestraw':           'survival-edc-tech',
  'paracord':            'survival-edc-tech',
  'tattica':             'survival-edc-tech',
  'accendino':           'survival-edc-tech',
  'emergenza':           'survival-edc-tech',
  'emergency':           'survival-edc-tech',
  'mylar':               'survival-edc-tech',
  'impronta':            'survival-edc-tech',
  'flashlight':          'survival-edc-tech',
  'torcia':              'survival-edc-tech',
  'multitool':           'survival-edc-tech',
  'fingerprint':         'survival-edc-tech',
};

/** Categorie valide nel progetto — usate per il fallback da CSV/filename */
const KNOWN_CATEGORY_SLUGS = new Set([
  'hardware-crypto-wallets',
  'tactical-power-grid',
  'comms-security-shield',
  'sim-racing-accessories-premium',
  'trading-gaming-desk-accessories-premium',
  'survival-edc-tech',
  'Smart Security',
  'Tactical Power',
  'PC Hardware',
  'Smart Home',
  '3D Printing',
]);

/**
 * Override categoria per file specifici.
 * Key: nome file CSV (case-insensitive) → Value: categoria esatta da salvare nel DB.
 * Ha priorità assoluta su qualsiasi altra logica di classificazione.
 */
const FILE_CATEGORY_OVERRIDES: Record<string, string> = {
  'smart_security.csv': 'Smart Security',
  'tactila power.csv':  'Tactical Power',
  'pc_hardwer.csv':     'PC Hardware',
  'smart_home.csv':     'Smart Home',
  '3d_printing.csv':    '3D Printing',
};

/**
 * Classifica un prodotto nella categoria corretta.
 * Strategia a cascata:
 *   0. Override da filename (FILE_CATEGORY_OVERRIDES) — priorità assoluta
 *   1. Keyword matching sul nome prodotto (CATEGORY_MAP)
 *   2. Fallback: CSV category column è già uno slug valido → usalo
 *   3. Fallback: keyword matching sul valore categoria del CSV
 *   4. Fallback: keyword matching sul nome del file CSV (rimpiazza - e _ con spazio)
 */
function classifyCategory(name: string, csvCategory = '', filename = ''): string {
  // 0. File-level override — categoria fissa indipendente dal contenuto
  const fileOverride = FILE_CATEGORY_OVERRIDES[filename.toLowerCase()];
  if (fileOverride) return fileOverride;

  const lower = name.toLowerCase();

  // 1. Keyword matching sul nome — multi-parola prima delle singole
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }

  // 2. CSV category column = slug valido
  const csvLower = csvCategory.toLowerCase().trim();
  if (csvLower && KNOWN_CATEGORY_SLUGS.has(csvLower)) return csvLower;

  // 3. Keyword matching sul valore categoria del CSV
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (csvLower.includes(keyword)) return cat;
  }

  // 4. Keyword matching sul nome del file (es. "power-bank.csv" → tactical-power-grid)
  const fileLower = filename.toLowerCase().replace(/[-_]/g, ' ').replace(/\.csv$/, '');
  if (fileLower) {
    for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
      if (fileLower.includes(keyword)) return cat;
    }
  }

  return UNSORTED_CAT;
}

// Pool di User-Agent per rotazione anti-bot
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
];
let uaIndex = 0;
const nextUA = () => USER_AGENTS[uaIndex++ % USER_AGENTS.length];

// ──────────────────────────────────────────────
// ENV
// ──────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (key) process.env[key] = val;
    }
  } catch {
    // .env.local non trovato — usa variabili di sistema
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
);

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;

// ──────────────────────────────────────────────
// SUPABASE — INIZIALIZZAZIONE AUTONOMA
// ──────────────────────────────────────────────
const REQUIRED_COLUMNS: Array<{ name: string; type: string }> = [
  { name: 'name',             type: 'TEXT' },
  { name: 'price',            type: 'NUMERIC' },
  { name: 'category',         type: 'TEXT' },
  { name: 'description',      type: 'TEXT' },
  { name: 'image_url',        type: 'TEXT' },
  { name: 'image_urls',       type: 'TEXT[]' },
  { name: 'affiliate_url',    type: 'TEXT' },
  { name: 'is_price_pending', type: 'BOOLEAN DEFAULT false' },
];

async function execSql(sql: string): Promise<boolean> {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    log(C.yellow, 'DDL', `exec_sql non disponibile (${error.message})`);
    log(C.yellow, 'DDL', `Esegui manualmente nel SQL Editor: ${sql}`);
    return false;
  }
  return true;
}

async function ensureTable(): Promise<void> {
  const sql = `
    CREATE TABLE IF NOT EXISTS products (
      id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
      name             TEXT        UNIQUE NOT NULL,
      price            NUMERIC,
      category         TEXT,
      description      TEXT,
      image_url        TEXT,
      image_urls       TEXT[],
      affiliate_url    TEXT,
      is_price_pending BOOLEAN     DEFAULT false,
      created_at       TIMESTAMPTZ DEFAULT now()
    );
  `.trim();
  log(C.blue, 'DB INIT', 'Creo tabella products (IF NOT EXISTS)...');
  const ok = await execSql(sql);
  if (ok) log(C.green, 'DB INIT', 'Tabella products pronta');
}

async function ensureColumns(): Promise<void> {
  log(C.blue, 'DB INIT', 'Verifico colonne richieste...');
  for (const col of REQUIRED_COLUMNS) {
    const sql = `ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`;
    const ok  = await execSql(sql);
    if (ok) log(C.green, 'DB INIT', `Colonna "${col.name}" verificata (${col.type})`);
  }
}

async function initSupabase(): Promise<void> {
  log(C.blue, 'DB INIT', 'Verifico connessione a Supabase...');
  const { error } = await supabase.from('products').select('id').limit(1);
  if (!error) {
    log(C.green, 'DB INIT', 'Connesso. Tabella products esistente.');
    await ensureColumns();
    return;
  }
  if (error.code === '42P01' || error.message.includes('does not exist')) {
    log(C.yellow, 'DB INIT', 'Tabella products non trovata — tento la creazione...');
    await ensureTable();
    await ensureColumns();
    return;
  }
  throw new Error(`Connessione Supabase fallita: ${error.message}`);
}

// ──────────────────────────────────────────────
// SUPABASE — ESISTENZA PRODOTTO / CATEGORIE
// ──────────────────────────────────────────────

/** Controlla se il prodotto esiste già per nome; restituisce la descrizione salvata. */
async function findExisting(name: string): Promise<{ exists: boolean; description: string }> {
  const { data } = await supabase
    .from('products')
    .select('description')
    .eq('name', name)
    .maybeSingle();
  if (!data) return { exists: false, description: '' };
  return { exists: true, description: (data.description as string) ?? '' };
}

/** Carica tutte le categorie distinte presenti nel DB. Set vuoto = primo import. */
async function loadExistingCategories(): Promise<Set<string>> {
  const { data, error } = await supabase.from('products').select('category');
  if (error || !data || data.length === 0) return new Set();
  return new Set(
    (data as Array<{ category: string }>)
      .map((r) => r.category)
      .filter(Boolean),
  );
}

// ──────────────────────────────────────────────
// REVISIONE — Append prodotto non importabile
// ──────────────────────────────────────────────
function appendToRevisione(name: string, link: string, reason: string): void {
  const date = new Date().toLocaleDateString('it-IT');
  const line = `[${date}] Nome Prodotto: ${name} | Link: ${link} | Motivo: ${reason}\n`;
  appendFileSync(REVISIONE_PATH, line, 'utf-8');
}

// ──────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────
function delay(minMs = 3000, maxMs = 6000): Promise<void> {
  const ms  = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  const sec = (ms / 1000).toFixed(1);
  log(C.yellow, 'SISTEMA', `Pausa tattica anti-bot: attendo ${sec} secondi...`);
  return new Promise((r) => setTimeout(r, ms));
}

// ──────────────────────────────────────────────
// CSV PARSER — Universal header-aware
// ──────────────────────────────────────────────
interface Product {
  name:     string;
  price:    number | null;
  category: string;
  asin:     string | null;
  currency: 'EUR' | 'USD' | 'UNKNOWN';
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current  = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const PLACEHOLDER = /^INSERIRE_/i;
const ASIN_RE     = /^[A-Z0-9]{10}$/i;

/**
 * Normalizza un'intestazione CSV:
 * rimuove zero-width chars, caratteri di controllo, quote, spazi extra.
 */
function normHeader(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '') // control + zero-width
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Alias per ogni colonna logica — più sinonimi = più compatibilità
const NAME_ALIASES: string[] = [
  'nome_prodotto', 'nome prodotto', 'nome', 'product_name', 'product name', 'prodotto', 'name',
];
const CATEGORY_ALIASES: string[] = [
  'categoria', 'category',
];
const PRICE_ALIASES: string[] = [
  'prezzo (€)', 'prezzo_eur', 'prezzo_usd', 'estimated_price_eur', 'prezzo_stimato_eur',
  'price', 'prezzo', 'price €', 'price eur', 'price usd',
];
const ASIN_ALIASES: string[] = [
  'amazon_asin', 'asin_amazon', 'asin amazon', 'asin',
];
const LINK_ALIASES: string[] = [
  'link_esempio_amazon.it', 'link affiliazione (esempio)', 'link_affiliazione_(esempio)',
  'link affiliazione', 'link_affiliazione', 'link_esempio', 'link', 'amazon link', 'amazon_link',
];

interface ColMap {
  nameIdx:     number;
  categoryIdx: number;
  priceIdx:    number;
  asinIdx:     number;
  linkIdx:     number;
}

function detectColumns(headers: string[]): ColMap {
  const normed = headers.map(normHeader);
  
  // Rimuovi caratteri speciali per matching robusto (ignora €, %, etc)
  const sanitize = (s: string) => s.replace(/[^a-z0-9\s]/g, '').trim();
  const sanitized = normed.map(sanitize);
  
  const find   = (aliases: string[]) => {
    const sanAliases = aliases.map(sanitize);
    for (let i = 0; i < sanAliases.length; i++) {
      const alias = sanAliases[i];
      if (alias === '') continue; // skip empty aliases
      const idx = sanitized.findIndex((s) => s === alias || s.includes(alias));
      if (idx !== -1) return idx;
    }
    return -1;
  };
  return {
    nameIdx:     find(NAME_ALIASES),
    categoryIdx: find(CATEGORY_ALIASES),
    priceIdx:    find(PRICE_ALIASES),
    asinIdx:     find(ASIN_ALIASES),
    linkIdx:     find(LINK_ALIASES),
  };
}

/**
 * Estrattore ASIN universale: cerca il pattern B0XXXXXXXX in qualsiasi stringa
 * (nome prodotto, URL, testo libero).
 */
function extractAsinFromText(text: string): string | null {
  const m = text.match(/\b(B0[0-9A-Z]{8})\b/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Estrae ASIN da un URL Amazon.
 * Restituisce null per URL di ricerca (?k=... / /s?) senza ASIN diretto.
 */
function extractAsinFromUrl(url: string): string | null {
  // URL di ricerca testuale — nessun ASIN diretto
  if (/[?&](?:s|k)=|\/s\?|\/s\//.test(url)) return null;
  // /dp/ASIN — formato classico
  const dp = url.match(/\/dp\/([A-Z0-9]{10})(?:[/?#%&]|$)/i);
  if (dp) return dp[1].toUpperCase();
  // Fallback: pattern B0XXXXXXXX nell'URL
  return extractAsinFromText(url);
}

/**
 * Rileva la valuta dal nome delle intestazioni CSV.
 * Cerca "usd" o "eur" nelle intestazioni; restituisce UNKNOWN se nessun match.
 */
function detectCurrency(headers: string[]): 'EUR' | 'USD' | 'UNKNOWN' {
  const normed = headers.map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  if (normed.some(h => h.includes('usd'))) return 'USD';
  if (normed.some(h => h.includes('eur'))) return 'EUR';
  return 'UNKNOWN';
}

/**
 * Pre-processa una riga CSV raw per normalizzare i decimali europei (virgola → punto)
 * SOLO nelle parti non quotate, e SOLO per pattern \d,\d{1,2} (decimale, non separatore migliaia).
 * Esempio: ...,189,99,4.6,...  →  ...,189.99,4.6,...
 * Limita la sostituzione a una sola virgola decimale per campo (fieldHasDecimal).
 */
function fixEuropeanDecimals(line: string): string {
  let result = '';
  let inQuotes = false;
  let fieldHasDecimal = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      result += ch;
    } else if (!inQuotes && ch === ',') {
      // Controlla se questa virgola è un separatore decimale europeo (non separatore di campo)
      if (!fieldHasDecimal && i > 0 && i < line.length - 1) {
        const prevIsDigit = /\d/.test(line[i - 1]);
        if (prevIsDigit) {
          const ahead = line.slice(i + 1);
          // Solo 1-2 cifre (decimali) prima della prossima virgola/fine riga
          if (/^\d{1,2}(?:,|$)/.test(ahead)) {
            result += '.'; // sostituisci virgola decimale con punto
            fieldHasDecimal = true;
            continue;
          }
        }
      }
      // Separatore di campo normale: resetta flag per il campo successivo
      result += ch;
      fieldHasDecimal = false;
    } else {
      result += ch;
    }
  }
  return result;
}

/**
 * Arrotonda un valore al .90 più vicino (verso l'alto).
 * Es: 36.79 → 36.90 | 36.95 → 37.90 | 36.90 → 36.90
 */
function roundToNinety(value: number): number {
  const floored  = Math.floor(value);
  const candidate = floored + 0.90;
  // usa una tolleranza minima per evitare errori floating-point
  return candidate >= value - 0.001 ? candidate : candidate + 1.00;
}

/**
 * Formula Kitwer: markup 20% puro + arrotondamento commerciale .90.
 * Nessuna flat fee.
 *
 * Esempio: 229,99 EUR → Math.floor(229.99 × 1.20) + 0.90 = 275 + 0.90 = 275.90
 */
function applyKitwerFormula(basePrice: number, currency: 'EUR' | 'USD' | 'UNKNOWN'): number {
  const priceEur = currency === 'USD' ? basePrice * USD_TO_EUR_RATE : basePrice;
  return Math.floor(priceEur * 1.20) + 0.90;
}

function parseCsv(content: string): Product[] {
  const lines = content.trim().split(/\r\n|\n|\r/);
  if (lines.length < 2) return [];

  const headers  = parseCsvLine(lines[0]);
  const map      = detectColumns(headers);
  const currency = detectCurrency(headers);

  if (map.nameIdx === -1 || map.categoryIdx === -1) {
    log(C.red, 'CSV', `Intestazioni non riconosciute: ${lines[0]}`);
    log(C.red, 'CSV', `Colonne lette: ${headers.map(normHeader).join(' | ')}`);
    return [];
  }

  const results: Product[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    // Normalizza decimali europei (189,99 → 189.99) prima di splittare in campi,
    // così tutti gli indici di colonna rimangono allineati all'intestazione.
    const fixedLine = fixEuropeanDecimals(line);
    const cols      = parseCsvLine(fixedLine);
    const name      = (cols[map.nameIdx]     ?? '').trim();
    const category  = (cols[map.categoryIdx] ?? '').trim();

    if (!name || name === 'name' || name === 'prodotto' || PLACEHOLDER.test(name)) continue;
    if (!category || PLACEHOLDER.test(category)) continue;

    // Prezzo: null se mancante — non blocca l'import
    const rawPrice = map.priceIdx !== -1 ? (cols[map.priceIdx] ?? '').trim() : '';
    const price    = rawPrice !== '' ? parseFloat(rawPrice) : null;

    // ASIN: campo dedicato → colonna link → null
    const rawAsin = map.asinIdx !== -1 ? (cols[map.asinIdx] ?? '').trim() : '';
    const rawLink = map.linkIdx !== -1 ? (cols[map.linkIdx] ?? '').trim() : '';

    let asin: string | null = null;
    if (ASIN_RE.test(rawAsin)) {
      asin = rawAsin.toUpperCase();
    } else if (rawAsin.startsWith('http')) {
      asin = extractAsinFromUrl(rawAsin);
    }
    if (!asin && rawLink.startsWith('http')) {
      asin = extractAsinFromUrl(rawLink);
    }

    results.push({ name, price, category, asin, currency });
  }

  return results;
}

/**
 * Parser EXCEL (XLSX) — Stessa logica parseCsv() ma per file Excel
 * Supporta i file dalla cartella MAGAZZINO/
 */
function parseExcel(filePath: string): Product[] {
  try {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    
    if (!firstSheet) {
      log(C.red, 'EXCEL', `Nessun foglio trovato in ${filePath}`);
      return [];
    }

    // Leggi tutte le righe come array di array
    const rows = XLSX.utils.sheet_to_json(firstSheet, { 
      header: 1,
      defval: '',
    }) as Array<string[]>;

    if (rows.length < 2) {
      log(C.red, 'EXCEL', `File Excel vuoto o con solo intestazione: ${filePath}`);
      return [];
    }

    const headers  = (rows[0] || []).map((h) => String(h ?? '').trim());
    const map      = detectColumns(headers);
    const currency = detectCurrency(headers);

    if (map.nameIdx === -1 || map.categoryIdx === -1) {
      log(C.red, 'EXCEL', `Intestazioni non riconosciute: ${headers.join(' | ')}`);
      log(C.red, 'EXCEL', `Colonne lette: ${headers.map(normHeader).join(' | ')}`);
      return [];
    }

    const results: Product[] = [];

    for (const row of rows.slice(1)) {
      if (!row || !row.length) continue;

      const name     = (row[map.nameIdx]     ?? '').toString().trim();
      const category = (row[map.categoryIdx] ?? '').toString().trim();

      if (!name || name === 'name' || name === 'prodotto' || PLACEHOLDER.test(name)) continue;
      if (!category || PLACEHOLDER.test(category)) continue;

      // Prezzo: null se mancante.
      // Excel gestisce i numeri nativamente; per celle stringa con virgola europea, normalize.
      const rawPrice = map.priceIdx !== -1 ? (row[map.priceIdx] ?? '').toString().trim() : '';
      const price    = rawPrice !== '' ? parseFloat(rawPrice.replace(',', '.')) : null;

      // ASIN: campo dedicato → colonna link → null
      const rawAsin = map.asinIdx !== -1 ? (row[map.asinIdx] ?? '').toString().trim() : '';
      const rawLink = map.linkIdx !== -1 ? (row[map.linkIdx] ?? '').toString().trim() : '';

      let asin: string | null = null;
      if (ASIN_RE.test(rawAsin)) {
        asin = rawAsin.toUpperCase();
      } else if (rawAsin.startsWith('http')) {
        asin = extractAsinFromUrl(rawAsin);
      }
      if (!asin && rawLink.startsWith('http')) {
        asin = extractAsinFromUrl(rawLink);
      }

      results.push({ name, price, category, asin, currency });
    }

    return results;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(C.red, 'EXCEL', `Errore parsing ${filePath}: ${msg}`);
    return [];
  }
}

// ──────────────────────────────────────────────
// AMAZON — SCRAPING GALLERIA IMMAGINI DA PAGINA PRODOTTO
// ──────────────────────────────────────────────

/**
 * Recupera la gallery completa di immagini per un ASIN Amazon.
 * Restituisce un array di URL (massimo ~8 immagini hi-res).
 * Fallback garantito: almeno 1 elemento (mai array vuoto).
 */
async function fetchProductGallery(asin: string): Promise<string[]> {
  const fallbackUrl = `https://m.media-amazon.com/images/I/${asin}.jpg`;
  try {
    const url = `https://www.amazon.it/dp/${asin}/`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':      nextUA(),
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [fallbackUrl];
    const html = await res.text();

    // 1. Estrai tutte le immagini hi-res dal JSON colorImages (galleria completa)
    const hiResMatches = [...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g)];
    if (hiResMatches.length > 0) {
      const urls = [...new Set(hiResMatches.map((m) => m[1]))];
      log(C.green, 'GALLERY', `${urls.length} immagini hi-res trovate per ${asin}`);
      return urls;
    }

    // 2. Fallback: immagini "large" dal JSON
    const largeMatches = [...html.matchAll(/"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g)];
    if (largeMatches.length > 0) {
      const urls = [...new Set(largeMatches.map((m) => m[1]))];
      log(C.green, 'GALLERY', `${urls.length} immagini large trovate per ${asin}`);
      return urls;
    }

    // 3. Fallback singola: og:image
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["'](https:\/\/[^"']+)["']/i)
            ?? html.match(/<meta[^>]+content=["'](https:\/\/m\.media-amazon\.com\/images\/I\/[^"']+)["'][^>]+property=["']og:image["']/i);
    if (og?.[1]) {
      log(C.green, 'GALLERY', `og:image come gallery singola per ${asin}`);
      return [og[1]];
    }

    // 4. Fallback singola: landingImageUrl
    const landing = html.match(/"landingImageUrl"\s*:\s*"(https:\/\/[^"]+)"/);
    if (landing?.[1]) {
      log(C.green, 'GALLERY', `landingImage come gallery singola per ${asin}`);
      return [landing[1]];
    }

    // 5. Fallback singola: data-old-hires
    const hiRes = html.match(/data-old-hires="(https:\/\/[^"]+)"/);
    if (hiRes?.[1]) {
      log(C.green, 'GALLERY', `data-old-hires come gallery singola per ${asin}`);
      return [hiRes[1]];
    }

    log(C.yellow, 'GALLERY', `Nessuna immagine trovata per ${asin} — uso fallback ASIN`);
    return [fallbackUrl];
  } catch {
    return [fallbackUrl];
  }
}

/** @deprecated Usa fetchProductGallery — mantenuta per retrocompatibilità */
async function fetchProductImage(asin: string): Promise<string> {
  const gallery = await fetchProductGallery(asin);
  return gallery[0];
}

/**
 * SEARCH IMAGE — Fallback robusta: cerca il prodotto su Amazon.it per nome
 * ed estrae l'immagine dal primo risultato (da fix-images-search.mjs)
 * Utile quando ASIN diretto non funziona o immagine mancante.
 */
async function searchProductImage(productName: string): Promise<string | null> {
  const q = encodeURIComponent(productName);
  const url = `https://www.amazon.it/s?k=${q}&language=it_IT`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      nextUA(),
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
        'Cache-Control':   'no-cache',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      log(C.yellow, 'IMG-SEARCH', `Amazon risponde ${res.status}`);
      return null;
    }

    const html = await res.text();

    if (
      html.toLowerCase().includes('captcha') ||
      html.includes('Type the characters')
    ) {
      log(C.yellow, 'IMG-SEARCH', 'Amazon ha mostrato CAPTCHA — fallback ASIN');
      return null;
    }

    // Estrai immagini dai srcset delle product card
    const srcsets = [...html.matchAll(/srcset="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g)];
    if (srcsets.length > 0) {
      // Prendi la prima URL dal srcset (la 1x, prima dello spazio)
      const firstUrl = srcsets[0][1].split(' ')[0];
      // Converti in alta risoluzione sostituendo il suffix
      const hiRes = firstUrl
        .replace(/\._AC_UL\d+_(?:QL\d+_)?\.jpg$/, '._AC_SL500_.jpg')
        .replace(/\._[^.]+\.jpg$/, '._AC_SL500_.jpg');
      log(C.green, 'IMG-SEARCH', `Trovata su ricerca: ${hiRes.slice(0, 80)}...`);
      return hiRes;
    }

    // Fallback: cerca pattern immagine generica
    const fallback = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+]{12,}\._[^ "]+\.jpg/);
    if (fallback) {
      const img = fallback[0].split(' ')[0];
      log(C.green, 'IMG-SEARCH', `Fallback immagine trovata`);
      return img;
    }

    log(C.yellow, 'IMG-SEARCH', `Nessuna immagine trovata per "${productName}"`);
    return null;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(C.yellow, 'IMG-SEARCH', `Errore: ${msg}`);
    return null;
  }
}

// ──────────────────────────────────────────────
// AMAZON — RICERCA ASIN PER NOME
// ──────────────────────────────────────────────
async function findAsin(name: string): Promise<string | null> {
  log(C.cyan, 'AMAZON', `Cerco ASIN per "${name}"...`);
  const query = encodeURIComponent(name);
  const url   = `https://www.amazon.it/s?k=${query}&ref=nb_sb_noss`;
  const ua    = nextUA();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':                ua,
        'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language':           'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding':           'gzip, deflate, br',
        'Cache-Control':             'no-cache',
        'Pragma':                    'no-cache',
        'Sec-Ch-Ua':                 '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile':          '?0',
        'Sec-Ch-Ua-Platform':        '"Windows"',
        'Sec-Fetch-Dest':            'document',
        'Sec-Fetch-Mode':            'navigate',
        'Sec-Fetch-Site':            'none',
        'Sec-Fetch-User':            '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection':                'keep-alive',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if ([403, 429, 503].includes(res.status)) {
      log(C.yellow, 'WARN', `Amazon risponde ${res.status} — ASIN non recuperabile`);
      return null;
    }

    const html = await res.text();
    if (
      html.toLowerCase().includes('captcha') ||
      html.toLowerCase().includes('robot check') ||
      html.includes('Type the characters')
    ) {
      log(C.yellow, 'WARN', 'Amazon ha mostrato CAPTCHA — ASIN non recuperabile');
      return null;
    }

    const asin =
      html.match(/data-asin="([A-Z0-9]{10})"/)?.[1] ??
      html.match(/\/dp\/([A-Z0-9]{10})/)?.[1]       ??
      null;

    if (asin) {
      log(C.green, 'ASIN', `Trovato: ${C.bright}${asin}`);
      return asin;
    }

    log(C.yellow, 'WARN', `Nessun ASIN nell'HTML per "${name}"`);
    return null;

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log(C.red, 'ERROR', `Errore richiesta Amazon: ${msg}`);
    return null;
  }
}

// ──────────────────────────────────────────────
// DEEPSEEK — DESCRIZIONE HTML PREMIUM
// ──────────────────────────────────────────────
async function generateDescription(name: string, category: string): Promise<string> {
  log(C.magenta, 'DEEPSEEK', `Genero descrizione per "${name}"...`);
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'Sei un copywriter di lusso specializzato in sicurezza, sopravvivenza tattica, crittografia e ' +
            'tecnologia EDC di alto profilo (hardware wallet, Faraday bag, UPS, sistemi di comunicazione sicura, ' +
            'postazioni operative, gear survival). ' +
            'Scrivi descrizioni prodotto in HTML puro (usa <p>, <strong>, <em>, nessun titolo), ' +
            'in italiano, con tono sofisticato da Security Consultant rivolto a clienti HNWI e milionari. ' +
            'Massimo 150 parole. ' +
            'Non aggiungere intestazioni h1/h2/h3. Solo HTML inline pronto per essere inserito in una pagina.',
        },
        {
          role: 'user',
          content:
            `Scrivi una descrizione HTML premium per questo prodotto:\n` +
            `Nome: "${name}"\nCategoria: "${category}"`,
        },
      ],
      max_tokens:  320,
      temperature: 0.82,
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek API error ${res.status}: ${await res.text()}`);

  const data        = await res.json();
  const description = (data.choices?.[0]?.message?.content as string) ?? '';
  log(C.magenta, 'DEEPSEEK', `Descrizione pronta (${description.length} chars)`);
  return description;
}

// ──────────────────────────────────────────────
// TIPO — riga del JSON finale
// ──────────────────────────────────────────────
interface Variant {
  name:   string;
  values: string[];
  images?: Record<string, string>; // valore → hiRes URL
}

interface ProductRow {
  name:             string;
  price:            number;
  category:         string;
  description:      string;
  image_url:        string;
  image_urls:       string[];
  affiliate_url:    string;
  is_price_pending: boolean;
  variants:         Variant[];
}

/**
 * Estrae le varianti (colore, taglia, ecc.) dalla pagina Amazon con immagini per valore.
 * Struttura target: [{ name: "Colore", values: ["Rosso","Blu"], images: {"Rosso":"https://..."} }]
 */
async function fetchProductVariants(asin: string): Promise<Variant[]> {
  try {
    const url = `https://www.amazon.it/dp/${asin}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': nextUA(), 'Accept-Language': 'it-IT,it;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // ── Estrai colorImages { "displayName": [{hiRes,large,thumb},...] } ──────
    const colorImagesMap: Record<string, string> = {}; // displayName → hiRes URL
    const ciMatch = html.match(/"colorImages"\s*:\s*(\{.+?\})\s*(?:,\s*"|\})/s);
    if (ciMatch) {
      try {
        // Il JSON di colorImages spesso non è valido isolato — wrappa e parse
        const ciJson = JSON.parse(ciMatch[1]) as Record<string, Array<{ hiRes?: string; large?: string }>>;
        for (const [key, imgs] of Object.entries(ciJson)) {
          if (key === 'initial') continue;
          const img = imgs?.[0];
          const imgUrl = img?.hiRes ?? img?.large;
          if (imgUrl) colorImagesMap[key] = imgUrl;
        }
      } catch { /* non bloccante */ }
    }

    // ── 1. dimensionValuesDisplayData → nomi display + match con colorImages ─
    const dvMatch = html.match(/"dimensionValuesDisplayData"\s*:\s*(\{[^}]+\})/);
    if (dvMatch) {
      try {
        const raw = JSON.parse(dvMatch[1]) as Record<string, string[]>;
        const variants: Variant[] = Object.entries(raw).map(([name, values]) => {
          const cleanValues = values.map((v) => v.trim()).filter(Boolean);
          // Cerca immagine per ogni valore (match esatto o parziale nella chiave colorImages)
          const images: Record<string, string> = {};
          for (const val of cleanValues) {
            const ciKey = Object.keys(colorImagesMap).find(
              (k) => k.toLowerCase() === val.toLowerCase() || k.toLowerCase().includes(val.toLowerCase())
            );
            if (ciKey) images[val] = colorImagesMap[ciKey];
          }
          return { name, values: cleanValues, ...(Object.keys(images).length > 0 ? { images } : {}) };
        }).filter((v) => v.values.length > 0);
        if (variants.length > 0) {
          const imgCount = variants.reduce((s, v) => s + Object.keys(v.images ?? {}).length, 0);
          log(C.green, 'VARIANTS', `${variants.length} varianti, ${imgCount} immagini variante per ${asin}`);
          return variants;
        }
      } catch { /* continua */ }
    }

    // ── 2. Fallback DOM: variation_color_name / variation_size_name ──────────
    const variants: Variant[] = [];

    const colorAll = [...html.matchAll(/id="variation_color_name"[\s\S]*?<option[^>]*>([^<]+)</gi)];
    const colorVals = colorAll.map((m) => m[1].trim()).filter((v) => v && v !== 'Seleziona');
    if (colorVals.length) {
      const images: Record<string, string> = {};
      for (const val of colorVals) {
        const ciKey = Object.keys(colorImagesMap).find((k) => k.toLowerCase().includes(val.toLowerCase()));
        if (ciKey) images[val] = colorImagesMap[ciKey];
      }
      variants.push({ name: 'Colore', values: colorVals, ...(Object.keys(images).length > 0 ? { images } : {}) });
    }

    const sizeAll = [...html.matchAll(/id="variation_size_name"[\s\S]*?<option[^>]*>([^<]+)</gi)];
    const sizeVals = sizeAll.map((m) => m[1].trim()).filter((v) => v && v !== 'Seleziona');
    if (sizeVals.length) variants.push({ name: 'Taglia', values: sizeVals });

    if (variants.length > 0) log(C.green, 'VARIANTS', `${variants.length} varianti (fallback DOM) per ${asin}`);
    return variants;
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// SALVATAGGIO ROBUSTO — Schema-aware
// ──────────────────────────────────────────────
let hasMissingColumns = false;

function isColumnError(msg: string): boolean {
  return msg.toLowerCase().includes('could not find column');
}

async function saveProductSafe(row: ProductRow): Promise<void> {
  // Tentativo 1: inserimento completo
  const { error } = await supabase.from('products').insert(row);

  if (!error) return;

  if (isColumnError(error.message)) {
    log(C.yellow, 'SCHEMA', 'Aggiornamento cache schema richiesto');
    hasMissingColumns = true;

    // Fallback: rimuovi is_price_pending e riprova
    const { is_price_pending: _ignored, ...rowWithout } = row;
    const { error: err2 } = await supabase.from('products').insert(rowWithout);

    if (!err2) {
      log(C.yellow, 'SCHEMA', `Salvato senza "is_price_pending" (colonna non ancora disponibile nel DB)`);
      return;
    }

    if (isColumnError(err2.message)) {
      throw new Error(`Colonna DB mancante — prodotto saltato: ${err2.message}`);
    }

    throw new Error(`Supabase: ${err2.message}`);
  }

  throw new Error(`Supabase: ${error.message}`);
}

/**
 * UPSERT PRODUCT — inserisce o aggiorna in base al nome (onConflict: 'name').
 * Impedisce duplicati ogni volta che lo script viene rieseguito.
 */
async function upsertProductSafe(row: ProductRow): Promise<void> {
  const { error } = await supabase.from('products').upsert(row, { onConflict: 'name' });

  if (!error) return;

  if (isColumnError(error.message)) {
    log(C.yellow, 'SCHEMA', 'Aggiornamento cache schema richiesto');
    hasMissingColumns = true;

    const { is_price_pending: _ignored, ...rowWithout } = row;
    const { error: err2 } = await supabase
      .from('products')
      .upsert(rowWithout, { onConflict: 'name' });

    if (!err2) {
      log(C.yellow, 'SCHEMA', `Salvato senza "is_price_pending"`);
      return;
    }

    if (isColumnError(err2.message)) {
      throw new Error(`Colonna DB mancante — prodotto saltato: ${err2.message}`);
    }

    throw new Error(`Supabase: ${err2.message}`);
  }

  throw new Error(`Supabase: ${error.message}`);
}

// ──────────────────────────────────────────────
// TABELLA RIEPILOGO FINALE
// ──────────────────────────────────────────────
function printSummary(
  saved: number,
  skipped: number,
  failed: number,
  revisione: number,
  rejectReasonCounts: Map<string, number>,
) {
  const line = '─'.repeat(54);
  const pad  = (label: string, val: string | number) => {
    const l = `  ${label}`;
    return l + ' '.repeat(Math.max(1, 40 - l.length)) + val;
  };

  // Trova il motivo di scarto più frequente
  let mainReason = 'N/A';
  let maxCount   = 0;
  for (const [reason, count] of rejectReasonCounts) {
    if (count > maxCount) { maxCount = count; mainReason = reason; }
  }

  console.log(`\n${C.bright}${C.cyan}${line}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  SESSIONE COMPLETATA — ⚠ STRICT MODE${C.reset}`);
  console.log(`${C.bright}${C.cyan}${line}${C.reset}`);
  console.log(`${C.bright}${C.green}${pad('✓  PRODOTTI IMPORTATI (QUALITÀ OK)', saved)}${C.reset}`);
  console.log(`${C.bright}${C.red}${pad('✗  PRODOTTI SCARTATI (RIBELLI)', revisione)}${C.reset}`);
  if (revisione > 0)
    console.log(`${C.bright}${C.yellow}${pad('⚠  Motivo principale scarto', mainReason)}${C.reset}`);
  console.log(`${C.bright}${C.blue}${pad('↺  Già presenti nel DB (saltati)', skipped)}${C.reset}`);
  if (failed > 0)
    console.log(`${C.bright}${C.red}${pad('✗  Errori tecnici', failed)}${C.reset}`);
  if (rejectReasonCounts.size > 1) {
    console.log(`${C.bright}${C.cyan}${line}${C.reset}`);
    console.log(`${C.bright}${C.yellow}  Dettaglio scarti:${C.reset}`);
    for (const [reason, count] of rejectReasonCounts) {
      console.log(`${C.yellow}    • ${reason}: ${count}${C.reset}`);
    }
  }
  console.log(`${C.bright}${C.cyan}${line}${C.reset}`);
  console.log(`${C.gray}  Backup JSON → output/import_finale.json${C.reset}`);
  if (revisione > 0)
    console.log(`${C.gray}  Prodotti da revisionare → da_revisionare.txt${C.reset}`);
  console.log(`${C.bright}${C.cyan}${line}${C.reset}`);
  console.log(`\n${C.bright}Strict Mode: ${saved} prodotti eccellenti importati. ${revisione} ribelli scartati.${C.reset}\n`);
}

// ──────────────────────────────────────────────
// DA_REVISIONARE — Parser bulk import
// ──────────────────────────────────────────────
interface RevisioneEntry {
  name:   string;
  link:   string;
  reason: string;
}

function parseRevisione(): RevisioneEntry[] {
  let raw: string;
  try {
    raw = readFileSync(REVISIONE_PATH, 'utf-8');
  } catch {
    log(C.red, 'REVISIONE', 'File da_revisionare.txt non trovato');
    return [];
  }

  const seen    = new Set<string>();
  const entries: RevisioneEntry[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Format: [date] Nome Prodotto: <name> | Link: <link> | Motivo: <reason>
    const nameMatch   = trimmed.match(/Nome Prodotto:\s*(.+?)\s*\|\s*Link:/);
    const linkMatch   = trimmed.match(/Link:\s*(https?:\/\/[^\s|]+?)\s*\|\s*Motivo:/);
    const reasonMatch = trimmed.match(/Motivo:\s*(.+)$/);

    if (!nameMatch || !linkMatch || !reasonMatch) continue;

    const name   = nameMatch[1].trim();
    const link   = linkMatch[1].trim();
    const reason = reasonMatch[1].trim();

    if (seen.has(name)) continue;
    seen.add(name);

    entries.push({ name, link, reason });
  }

  return entries;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
  const permissive = process.argv.includes('--permissive');
  const upsertMode = process.argv.includes('--upsert');
  const modeLabel  = permissive ? 'PERMISSIVE MODE (UNSORTED consentite)' : 'STRICT MODE (solo categorie note)';
  const updateLabel = upsertMode ? ' + UPSERT (aggiorna prodotti esistenti)' : '';
  
  console.log(`\n${C.bright}${C.cyan}${'━'.repeat(54)}${C.reset}`);
  console.log(`${C.bright}${C.cyan}   AUTO-IMPORTER — Universal CSV Importer${C.reset}`);
  console.log(`${C.bright}${permissive ? C.yellow : C.red}   ⚠  ${modeLabel}${updateLabel}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'━'.repeat(54)}${C.reset}\n`);

  // 1. Connessione + tabella + colonne
  await initSupabase();

  // 2. Carica categorie esistenti per validazione
  const existingCategories = await loadExistingCategories();
  if (existingCategories.size > 0) {
    log(C.gray, 'CAT', `Categorie nel DB (${existingCategories.size}): ${[...existingCategories].join(', ')}`);
  } else {
    log(C.yellow, 'CAT', 'Nessuna categoria nel DB — primo import, accetto tutte le categorie');
  }

  // allResults rimosso: non accumula più in RAM — il backup viene scritto riga per riga
  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, '[\n', 'utf-8');
  let firstJsonRow = true;

  let totalSaved     = 0;
  let totalSkipped   = 0;
  let totalFailed    = 0;
  let totalRevisione = 0;
  let totalUnsorted  = 0;
  const rejectReasonCounts = new Map<string, number>();

  const trackRejection = (name: string, link: string, reason: string): void => {
    appendToRevisione(name, link, reason);
    rejectReasonCounts.set(reason, (rejectReasonCounts.get(reason) ?? 0) + 1);
    totalRevisione++;
  };

  // 3. Determina modalità: --from-revisione oppure CSV
  const fromRevisione = process.argv.includes('--from-revisione');

  if (fromRevisione) {
    // ── MODALITÀ BULK IMPORT DA da_revisionare.txt ───────────────────
    console.log(`\n${C.bright}${C.magenta}${'═'.repeat(54)}${C.reset}`);
    log(C.magenta, 'BULK', `Modalità --from-revisione attiva`);
    log(C.magenta, 'BULK', `Leggo: ${REVISIONE_PATH}`);
    console.log(`${C.bright}${C.magenta}${'═'.repeat(54)}${C.reset}\n`);

    const reviEntries = parseRevisione();
    log(C.gray, 'BULK', `${reviEntries.length} prodotti unici trovati in da_revisionare.txt\n`);

    let idx = 0;
    for (const entry of reviEntries) {
      const { name, link } = entry;
      idx++;
      console.log(`\n${C.bright}${C.yellow}── [${idx}/${reviEntries.length}] ${name} ──${C.reset}`);

      try {
        // Già nel DB?
        const { exists } = await findExisting(name);
        if (exists && !upsertMode) {
          log(C.blue, 'SKIP', `"${name}" già nel DB — salto`);
          totalSkipped++;
          continue;
        }
        if (exists && upsertMode) {
          log(C.cyan, 'UPSERT', `"${name}" già nel DB → aggiornamento...`);
        }

        // Categoria: verifica con CATEGORY_MAP aggiornato
        const finalCategory = classifyCategory(name);
        if (finalCategory === UNSORTED_CAT && !permissive) {
          log(C.red, 'SCARTATO', `"${name}" → Categoria ancora sconosciuta — salto`);
          trackRejection(name, link, 'Categoria sconosciuta');
          continue;
        }
        if (finalCategory === UNSORTED_CAT && permissive) {
          log(C.yellow, 'UNSORTED', `"${name}" → Categoria sconosciuta ma importazione consentita (permissive mode)`);
        }
        log(C.green, 'CAT', `"${name}" → ${finalCategory}`);

        // ASIN: 1) link del file  2) nome prodotto  3) ricerca Amazon
        let asin: string | null = extractAsinFromUrl(link);
        if (asin) {
          log(C.green, 'ASIN', `Estratto dal link: ${C.bright}${asin}`);
        } else {
          asin = extractAsinFromText(name);
          if (asin) {
            log(C.green, 'ASIN', `Estratto dal nome prodotto: ${C.bright}${asin}`);
          } else {
            asin = await findAsin(name);
          }
        }
        if (!asin) {
          // ASIN mancante + prezzo 0 → impossibile recuperare dati
          log(C.red, 'SCARTATO', `"${name}" → IMPOSSIBILE RECUPERARE ASIN/PREZZO`);
          trackRejection(name, link, 'IMPOSSIBILE RECUPERARE ASIN/PREZZO');
          continue;
        }
        // Ricostruisci URL affiliato diretto (sovrascrive link di ricerca)
        log(C.green, 'ASIN', `Link prodotto costruito: ${C.bright}${asin}`);

        const affiliate_url = `https://www.amazon.it/dp/${asin}/?tag=${AFFILIATE_TAG}`;
        log(C.gray, 'LINK', affiliate_url);

        // Gallery: ASIN diretto → fallback search per nome
        const gallery = await fetchProductGallery(asin);
        if (gallery.length === 1 && gallery[0].endsWith(`${asin}.jpg`)) {
          const searchImg = await searchProductImage(name);
          if (searchImg) {
            gallery[0] = searchImg;
            log(C.cyan, 'IMG-SEARCH', `Fallback gallery attivato per "${name}"`);
          } else {
            const searchLink = `https://www.amazon.it/dp/${asin}/?tag=${AFFILIATE_TAG}`;
            trackRejection(name, searchLink, 'Immagine non trovata');
            log(C.red, 'SCARTATO', `"${name}" → Nessuna immagine trovata → da_revisionare.txt`);
            continue;
          }
        }
        const image_url  = gallery[0];
        const image_urls = gallery;
        log(C.gray, 'GALLERY', `${image_urls.length} immagini → ${image_url.slice(0, 80)}`);

        // Varianti
        const variants = await fetchProductVariants(asin);

        // Descrizione DeepSeek
        const description = await generateDescription(name, finalCategory);

        // Insert/Update su Supabase
        log(C.blue, 'SUPABASE', `${exists && upsertMode ? 'Aggiorno' : 'Salvo'} "${name}"...`);
        const row: ProductRow = {
          name,
          price:            0,
          category:         finalCategory,
          description,
          image_url,
          image_urls,
          affiliate_url,
          is_price_pending: true,
          variants,
        };
        
        await upsertProductSafe(row);
        log(C.green, exists ? 'AGGIORNATO' : 'SALVATO', `✓ [${idx}/${reviEntries.length}] "${name}"`);

        const prefix = firstJsonRow ? '  ' : ',\n  ';
        appendFileSync(OUTPUT_PATH, prefix + JSON.stringify(row), 'utf-8');
        firstJsonRow = false;
        totalSaved++;

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(C.red, 'ERRORE', `"${name}" fallito — ${msg}`);
        totalFailed++;
      }

      if (idx < reviEntries.length) await delay(4000, 7000);
    }

  } else {
    // ── MODALITÀ CSV STANDARD ────────────────────────────────────────
    const isCsv   = (s: string) => s.toLowerCase().endsWith('.csv');
    const isXlsx  = (s: string) => s.toLowerCase().endsWith('.xlsx');
    const cliArgs = process.argv.slice(2).filter((a) => isCsv(a) || isXlsx(a));

    interface FileEntry { filename: string; filePath: string; isExcel: boolean }
    let entries: FileEntry[];

    if (cliArgs.length > 0) {
      entries = cliArgs.map((p) => {
        const direct = resolve(p);
        // Se il file esiste direttamente, usalo
        if (existsSync(direct)) return { filename: basename(p), filePath: direct, isExcel: isXlsx(p) };
        // Altrimenti cerca una corrispondenza parziale in MAGAZZINO/
        const keyword = basename(p, extname(p)).toLowerCase();
        const allMag = existsSync(MAGAZZINO_DIR) ? readdirSync(MAGAZZINO_DIR).filter((f) => isCsv(f) || isXlsx(f)) : [];
        const match = allMag.find((f) => f.toLowerCase().includes(keyword));
        if (match) {
          const found = join(MAGAZZINO_DIR, match);
          log(C.yellow, 'SCAN', `"${p}" non trovato — uso "${match}" da MAGAZZINO/`);
          return { filename: match, filePath: found, isExcel: isXlsx(match) };
        }
        // Non trovato: restituisce il path originale (errore gestito dopo)
        return { filename: basename(p), filePath: direct, isExcel: isXlsx(p) };
      });
      log(C.cyan, 'SCAN', `Modalità forzata: ${entries.length} file specificati da CLI`);
    } else {
      const allFiles = readdirSync(MAGAZZINO_DIR)
        .filter((f) => isCsv(f) || isXlsx(f));
      entries = allFiles.map((f) => ({
        filename: f,
        filePath: join(MAGAZZINO_DIR, f),
        isExcel: isXlsx(f),
      }));
    }

    if (entries.length === 0) {
      log(C.yellow, 'SCAN', 'Nessun file CSV trovato in MAGAZZINO/.');
      return;
    }

    log(C.gray, 'SCAN', `Trovati ${entries.length} file: ${entries.map((e) => e.filename).join(', ')}\n`);

    // 4. Per ogni file CSV/XLSX
    for (const { filename, filePath, isExcel } of entries) {
      console.log(`\n${C.bright}${C.blue}${'═'.repeat(54)}${C.reset}`);
      log(C.blue, 'FILE', `Sto analizzando ${filename}`);
      console.log(`${C.bright}${C.blue}${'═'.repeat(54)}${C.reset}\n`);

      let fileSaved  = 0;
      let fileFailed = 0;

      try {
        let products: Product[];
        
        if (isExcel) {
          log(C.cyan, 'XLSX', `Parsing file Excel: ${filename}`);
          products = parseExcel(filePath);
        } else {
          log(C.cyan, 'CSV', `Parsing file CSV: ${filename}`);
          products = parseCsv(readFileSync(filePath, 'utf-8'));
        }

        if (products.length === 0) {
          log(C.yellow, 'FILE', `Nessuna riga valida in "${filename}" — salto`);
          continue;
        }

        log(C.gray, 'CSV', `${products.length} righe valide trovate in "${filename}"\n`);

        let idx = 0;
        for (const product of products) {
          const { name, price, currency } = product;
          idx++;
          console.log(`\n${C.bright}${C.yellow}── [${idx}/${products.length}] ${name} ──${C.reset}`);

          try {
            // a. Controlla subito nel DB: se esiste, salta (o aggiorna in modalità upsert)
            const { exists } = await findExisting(name);
            if (exists && !upsertMode) {
              log(C.blue, 'SKIP', `"${name}" già presente nel DB — salto`);
              totalSkipped++;
              continue;
            }
            if (exists && upsertMode) {
              log(C.cyan, 'UPSERT', `"${name}" già nel DB → aggiornamento...`);
            }

            // ── VALIDAZIONE ──────────────────────────────────────────────

            // b. Prezzo: se mancante → Price Fallback (price=0, is_price_pending=true)
            //    Altrimenti applica formula Kitwer: base×1.20 + 3.99, arrotondato a .90
            const isPricePending = price === null || isNaN(price) || price <= 0;
            const finalPriceVal  = isPricePending
              ? 0
              : applyKitwerFormula(price!, currency);
            if (isPricePending) {
              log(C.yellow, 'PREZZO', `"${name}" → Prezzo mancante — Price Fallback attivo (is_price_pending=true)`);
            } else {
              const currLabel = currency === 'USD'
                ? `${price!.toFixed(2)} USD (×${USD_TO_EUR_RATE} cambio)`
                : `${price!.toFixed(2)} EUR`;
              log(C.cyan, 'PREZZO', `Formula Kitwer: ${currLabel} × 1.20 + 3.99 → ${finalPriceVal.toFixed(2)} €`);
            }

            // c. Categoria: keyword → CSV category fallback → filename fallback
            const finalCategory = classifyCategory(name, product.category, filename);
            if (finalCategory === UNSORTED_CAT && !permissive) {
              const searchLink = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;
              trackRejection(name, searchLink, 'Categoria sconosciuta');
              log(C.red, 'SCARTATO', `"${name}" → Categoria sconosciuta → da_revisionare.txt`);
              continue;
            }
            if (finalCategory === UNSORTED_CAT && permissive) {
              log(C.yellow, 'UNSORTED', `"${name}" → Categoria sconosciuta ma importazione consentita (permissive mode)`);
            }
            log(C.green, 'IMPORT', `Prodotto: ${name} → Categoria: ${finalCategory}`);

            // d. ASIN: 1) campo CSV  2) nome prodotto  3) ricerca Amazon
            let asin: string | null = product.asin ?? null;
            if (asin) {
              log(C.green, 'ASIN', `Già nel CSV: ${C.bright}${asin}`);
            } else {
              asin = extractAsinFromText(name);
              if (asin) {
                log(C.green, 'ASIN', `Estratto dal nome prodotto: ${C.bright}${asin}`);
              } else {
                asin = await findAsin(name);
              }
            }
            if (!asin) {
              const searchLink = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;
              trackRejection(name, searchLink, 'ASIN non trovato');
              log(C.red, 'SCARTATO', `"${name}" → ASIN non trovato → da_revisionare.txt`);
              continue;
            }

            // e. URL immagine, gallery e link affiliato
            const affiliate_url = `https://www.amazon.it/dp/${asin}/?tag=${AFFILIATE_TAG}`;
            log(C.gray, 'LINK', affiliate_url);

            // Gallery: ASIN diretto → fallback search per nome
            const gallery = await fetchProductGallery(asin);
            if (gallery.length === 1 && gallery[0].endsWith(`${asin}.jpg`)) {
              const searchImg = await searchProductImage(name);
              if (searchImg) {
                gallery[0] = searchImg;
                log(C.cyan, 'IMG-SEARCH', `Fallback gallery attivato per "${name}"`);
              } else {
                const searchLink = `https://www.amazon.it/s?k=${encodeURIComponent(name)}&tag=${AFFILIATE_TAG}`;
                trackRejection(name, searchLink, 'Immagine non trovata');
                log(C.red, 'SCARTATO', `"${name}" → Nessuna immagine trovata → da_revisionare.txt`);
                continue;
              }
            }
            const image_url  = gallery[0];
            const image_urls = gallery;
            log(C.gray, 'GALLERY', `${image_urls.length} immagini → ${image_url.slice(0, 80)}`);

            // Varianti
            const variants = await fetchProductVariants(asin);

            // f. Genera descrizione DeepSeek (solo per prodotti nuovi e validi)
            const description = await generateDescription(name, finalCategory);

            // g. Insert/Update su Supabase
            log(C.blue, 'SUPABASE', `${exists && upsertMode ? 'Aggiorno' : 'Salvo'} "${name}"...`);
            const row: ProductRow = {
              name,
              price:            finalPriceVal,
              category:         finalCategory,
              description,
              image_url,
              image_urls,
              affiliate_url,
              is_price_pending: isPricePending,
              variants,
            };
            
            await upsertProductSafe(row);
            log(C.green, exists ? 'AGGIORNATO' : 'SALVATO', `✓ [${idx}/${products.length}] "${name}"`);

            const prefix = firstJsonRow ? '  ' : ',\n  ';
            appendFileSync(OUTPUT_PATH, prefix + JSON.stringify(row), 'utf-8');
            firstJsonRow = false;
            fileSaved++;
            totalSaved++;

          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            log(C.red, 'ERRORE', `[${idx}/${products.length}] "${name}" fallito — ${msg}`);
            fileFailed++;
            totalFailed++;
          }

          // Pausa tattica anti-bot tra prodotti
          if (idx < products.length) await delay(4000, 7000);
        }

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log(C.red, 'ERRORE', `Impossibile leggere "${filename}" — ${msg}`);
        fileFailed++;
        totalFailed++;
      }

      log(
        C.green,
        'FILE',
        `"${filename}": ${fileSaved} nuovi inseriti${fileFailed > 0 ? ` (${fileFailed} falliti)` : ''}`,
      );
    }
  }

  // 5. Chiudi il backup JSON (array aperto riga per riga durante il run)
  appendFileSync(OUTPUT_PATH, '\n]\n', 'utf-8');

  // 6. Tabella riepilogo qualità finale
  printSummary(totalSaved, totalSkipped, totalFailed, totalRevisione, rejectReasonCounts);

  // 7. Avviso schema non sincronizzato
  if (hasMissingColumns) {
    console.log(`\n${C.bright}${C.red}⚠  ATTENZIONE: Alcune colonne non sono sincronizzate nel DB${C.reset}`);
    console.log(`${C.yellow}   Esegui nel SQL Editor di Supabase:${C.reset}`);
    console.log(`${C.gray}   ALTER TABLE products ADD COLUMN IF NOT EXISTS is_price_pending BOOLEAN DEFAULT false;${C.reset}\n`);
  }
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  log(C.red, 'FATAL', msg);
  process.exit(1);
});
