/**
 * FIND-AMAZON-LINKS — Trova link Amazon reali per prodotti nei CSV di MAGAZZINO
 *
 * Strategia di ricerca (in ordine di affidabilità):
 *   1. Amazon.it search → estrae data-asin dal primo risultato
 *   2. DuckDuckGo fallback → cerca "nome site:amazon.it" ed estrae ASIN
 *   3. Pausa anti-bot 3–6s tra ogni prodotto
 *
 * URL finale: https://www.amazon.it/dp/{ASIN}?tag=kitwer26-21
 *
 * Run:
 *   node scripts/find-amazon-links.mjs                          ← tutti i CSV in MAGAZZINO/
 *   node scripts/find-amazon-links.mjs crypto_wallets.CSV       ← file specifico
 *   node scripts/find-amazon-links.mjs crypto_wallets.CSV --all ← forza ri-ricerca anche URL validi
 *   node scripts/find-amazon-links.mjs crypto_wallets.CSV --dry ← solo anteprima, non scrive
 */

import { readFileSync, writeFileSync, renameSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';

// ── Colori terminale ──────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  gray:    '\x1b[90m',
};
const ts  = () => new Date().toLocaleTimeString('it-IT');
const log = (color, tag, msg) => console.log(`${C.gray}${ts()}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);

// ── Costanti ──────────────────────────────────────────────────────────────────
const MAGAZZINO_DIR = resolve(process.cwd(), 'MAGAZZINO');
const AFFILIATE_TAG = 'kitwer26-21';
const TIMEOUT_MS    = 12_000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
];
let uaIdx = 0;
const nextUA = () => USER_AGENTS[uaIdx++ % USER_AGENTS.length];

// ── Utility ───────────────────────────────────────────────────────────────────
function delay(minMs = 3000, maxMs = 6000) {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  log(C.yellow, 'WAIT', `Pausa anti-bot ${(ms / 1000).toFixed(1)}s...`);
  return new Promise(r => setTimeout(r, ms));
}

function buildAmazonUrl(asin) {
  return `https://www.amazon.it/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function isPlaceholderUrl(url, productName) {
  if (!url || url.trim() === '') return true;
  // Considera placeholder se l'URL non ha il tag affiliato
  if (!url.includes('tag=')) return true;
  // Considera placeholder se il path contiene le parole del nome prodotto
  // (costruito manualmente, non estratto da Amazon)
  const words = (productName || '').toLowerCase().split(/[\s\-]+/).filter(w => w.length > 3);
  const urlPath = url.toLowerCase();
  if (words.length >= 2 && words.slice(0, 3).every(w => urlPath.includes(w))) return true;
  return false;
}

// ── Ricerca su Amazon.it ──────────────────────────────────────────────────────
async function searchOnAmazon(query) {
  const q   = encodeURIComponent(query);
  const url = `https://www.amazon.it/s?k=${q}&language=it_IT`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      nextUA(),
        'Accept':          'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control':   'no-cache',
        'DNT':             '1',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });

    if (!res.ok) {
      log(C.yellow, 'AMZN', `HTTP ${res.status} per query: ${query}`);
      return null;
    }

    const html = await res.text();

    if (html.toLowerCase().includes('captcha') || html.includes('Type the characters')) {
      log(C.yellow, 'CAPTCHA', 'Amazon ha mostrato CAPTCHA — passo a DuckDuckGo');
      return null;
    }

    // Estrai tutti i data-asin visibili nella pagina
    const asins = [...html.matchAll(/data-asin="([A-Z0-9]{10})"/g)]
      .map(m => m[1])
      .filter(a => a && a !== '0000000000');

    if (asins.length > 0) {
      const asin = asins[0];
      log(C.green, 'AMZN', `ASIN trovato: ${asin}`);
      return buildAmazonUrl(asin);
    }

    // Fallback: cerca link /dp/ diretti nell'HTML
    const dpMatch = html.match(/href="(\/[^"]+\/dp\/([A-Z0-9]{10})[^"]*)"/);
    if (dpMatch) {
      const asin = dpMatch[2].toUpperCase();
      log(C.green, 'AMZN', `ASIN da href: ${asin}`);
      return buildAmazonUrl(asin);
    }

    log(C.yellow, 'AMZN', 'Nessun ASIN trovato nella pagina di ricerca');
    return null;

  } catch (err) {
    log(C.red, 'AMZN', `Errore fetch: ${err.message}`);
    return null;
  }
}

// ── Fallback: DuckDuckGo ──────────────────────────────────────────────────────
async function searchOnDDG(query) {
  const q   = encodeURIComponent(`${query} site:amazon.it`);
  const url = `https://html.duckduckgo.com/html/?q=${q}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      nextUA(),
        'Accept':          'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    });

    if (!res.ok) {
      log(C.yellow, 'DDG', `HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Cerca pattern amazon.it/dp/ASIN nei risultati DDG
    const match = html.match(/amazon\.it\/(?:[^/]+\/)?dp\/([A-Z0-9]{10})/i)
                || html.match(/amazon\.it\/gp\/product\/([A-Z0-9]{10})/i);

    if (match) {
      const asin = match[1].toUpperCase();
      log(C.green, 'DDG', `ASIN trovato: ${asin}`);
      return buildAmazonUrl(asin);
    }

    log(C.yellow, 'DDG', 'Nessun ASIN trovato su DuckDuckGo');
    return null;

  } catch (err) {
    log(C.red, 'DDG', `Errore fetch: ${err.message}`);
    return null;
  }
}

// ── Core: trova link per un singolo prodotto ──────────────────────────────────
async function findLink(productName, brand) {
  // Query 1: nome completo + marca
  const query1 = brand ? `${productName} ${brand}` : productName;
  let result = await searchOnAmazon(query1);
  if (result) return result;

  // Se Amazon ha bloccato, prova DuckDuckGo
  result = await searchOnDDG(query1);
  if (result) return result;

  // Query 2: solo nome prodotto (più generico)
  if (brand && query1 !== productName) {
    await delay(1500, 2500);
    result = await searchOnAmazon(productName);
    if (result) return result;
    result = await searchOnDDG(productName);
    if (result) return result;
  }

  return null;
}

// ── Parser CSV minimalista ────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = splitCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

function splitCSVLine(line) {
  const result = [];
  let current  = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'; // escaped double-quote inside quoted field
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function serializeCSV(headers, rows) {
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

// ── Processa un singolo CSV ───────────────────────────────────────────────────
async function processCSV(csvPath, { forceAll = false, dryRun = false } = {}) {
  const filename = basename(csvPath);
  console.log(`\n${C.bright}${C.cyan}${'─'.repeat(60)}${C.reset}`);
  log(C.cyan, 'FILE', `Elaborazione: ${filename}`);

  const content = readFileSync(csvPath, 'utf-8');
  const { headers, rows } = parseCSV(content);

  const urlCol   = headers.find(h => /^url$/i.test(h.trim())) || headers.find(h => /url/i.test(h));
  const nameCol  = headers.find(h => /prodotto|name|nome/i.test(h));
  const brandCol = headers.find(h => /marca|brand/i.test(h));

  if (!urlCol) {
    log(C.yellow, 'SKIP', `Nessuna colonna URL trovata in ${filename}`);
    return { updated: 0, skipped: 0, failed: 0 };
  }

  const toProcess = rows.filter((row) => {
    if (forceAll) return true;
    const url  = row[urlCol];
    const name = row[nameCol] || '';
    return isPlaceholderUrl(url, name);
  });

  log(C.cyan, 'SCAN', `${toProcess.length} prodotti da aggiornare su ${rows.length} totali`);

  if (toProcess.length === 0) {
    log(C.green, 'OK', 'Tutti i link sono già presenti e validi');
    return { updated: 0, skipped: rows.length, failed: 0 };
  }

  let updated = 0, failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const row   = toProcess[i];
    const name  = row[nameCol] || `Prodotto #${i + 1}`;
    const brand = row[brandCol] || '';

    console.log(`\n${C.bright}${C.yellow}── [${i + 1}/${toProcess.length}] ${name}${brand ? ` (${brand})` : ''}${C.reset}`);

    const found = await findLink(name, brand);

    if (found) {
      if (!dryRun) row[urlCol] = found;
      log(C.green, dryRun ? 'DRY' : '✓ OK', found);
      updated++;
    } else {
      log(C.red, '✗ FAIL', `Nessun link trovato per: ${name}`);
      failed++;
    }

    if (i < toProcess.length - 1) await delay(3000, 6000);
  }

  if (!dryRun && updated > 0) {
    const newContent = serializeCSV(headers, rows);
    const tmpPath = csvPath + '.tmp';
    writeFileSync(tmpPath, newContent, 'utf-8');
    renameSync(tmpPath, csvPath); // atomic: no corruption on crash
    log(C.green, 'SAVED', `CSV aggiornato: ${filename}`);
  }

  return { updated, skipped: rows.length - toProcess.length, failed };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const args     = process.argv.slice(2);
  const forceAll = args.includes('--all');
  const dryRun   = args.includes('--dry');
  const fileArgs = args.filter(a => !a.startsWith('--'));

  console.log(`\n${C.bright}${C.cyan}╔${'═'.repeat(56)}╗${C.reset}`);
  console.log(`${C.bright}${C.cyan}║    FIND-AMAZON-LINKS — Kitwer26 Link Finder         ║${C.reset}`);
  console.log(`${C.bright}${C.cyan}╚${'═'.repeat(56)}╝${C.reset}`);
  console.log(`${C.gray}Modalità: ${forceAll ? 'FORZA TUTTO' : 'SOLO MANCANTI'} | ${dryRun ? 'DRY RUN (nessuna scrittura)' : 'SCRITTURA ATTIVA'}${C.reset}\n`);

  let csvFiles = [];

  if (fileArgs.length > 0) {
    csvFiles = fileArgs.map(f => {
      if (f.startsWith('/')) return f;
      if (f.includes('/')) return resolve(process.cwd(), f);
      return join(MAGAZZINO_DIR, f);
    });
  } else {
    csvFiles = readdirSync(MAGAZZINO_DIR)
      .filter(f => /\.(csv|CSV)$/.test(f))
      .map(f => join(MAGAZZINO_DIR, f));
  }

  if (csvFiles.length === 0) {
    log(C.red, 'ERR', 'Nessun CSV trovato');
    process.exit(1);
  }

  log(C.cyan, 'INFO', `File da processare: ${csvFiles.map(f => basename(f)).join(', ')}`);

  let totUpdated = 0, totSkipped = 0, totFailed = 0;

  for (const csvPath of csvFiles) {
    const { updated, skipped, failed } = await processCSV(csvPath, { forceAll, dryRun });
    totUpdated += updated;
    totSkipped += skipped;
    totFailed  += failed;
  }

  console.log(`\n${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bright}${C.green}  ✓ Aggiornati:  ${totUpdated}${C.reset}`);
  console.log(`${C.bright}${C.gray}  ↺ Saltati:     ${totSkipped}${C.reset}`);
  if (totFailed > 0)
    console.log(`${C.bright}${C.red}  ✗ Non trovati: ${totFailed}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}\n`);

  if (dryRun) log(C.yellow, 'DRY', 'Nessun file modificato (modalità dry run)');
}

main().catch(err => {
  console.error(`${C.red}[FATAL]${C.reset} ${err.message}`);
  process.exit(1);
});
