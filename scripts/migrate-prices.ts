/**
 * migrate-prices.ts — Migrazione prezzi da CSV a Supabase
 *
 * Legge tutti i CSV da MAGAZZINO/ e ARCHIVIO.PROD/, ricalcola i prezzi
 * con il markup del 20% (+ conversione USD→EUR se necessario) e aggiorna
 * i prodotti esistenti nel database Supabase facendo matching per nome.
 *
 * Modalità DRY-RUN di default (nessuna modifica al DB).
 * Passa --execute per applicare realmente gli aggiornamenti.
 *
 * Run:
 *   npx tsx scripts/migrate-prices.ts              ← dry-run (anteprima)
 *   npx tsx scripts/migrate-prices.ts --execute    ← applica aggiornamenti
 *
 * Richiede in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'fs';
import { resolve, join, basename, extname } from 'path';
import * as dotenv from 'dotenv';
import * as XLSX from 'xlsx';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const MAGAZZINO_DIR    = resolve(process.cwd(), 'MAGAZZINO');
const ARCHIVIO_DIR     = resolve(process.cwd(), 'ARCHIVIO.PROD');
const USD_TO_EUR       = 0.92;
const MARKUP           = 1.20;
const DRY_RUN          = !process.argv.includes('--execute');

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
  gray:    '\x1b[90m',
  blue:    '\x1b[34m',
};

function log(color: string, tag: string, msg: string) {
  const ts = new Date().toLocaleTimeString('it-IT');
  console.log(`${C.gray}${ts}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);
}

// ──────────────────────────────────────────────
// SUPABASE — usa service role per aggiornamenti admin
// ──────────────────────────────────────────────
const supabaseUrl        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(`${C.red}${C.bright}[ERRORE]${C.reset} NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti in .env.local`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ──────────────────────────────────────────────
// PRICE UTILITIES (inline per compatibilità tsx)
// ──────────────────────────────────────────────

/** Parsa prezzo con virgola italiana o punto americano */
function parsePrice(input: string): number {
  if (!input || typeof input !== 'string') return NaN;
  let cleaned = input.replace(/[€$£¥\s]/g, '').trim();
  if (!cleaned) return NaN;

  const hasComma = cleaned.includes(',');
  const hasDot   = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot   = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  }

  const value = parseFloat(cleaned);
  return isNaN(value) || value < 0 ? NaN : value;
}

/** Arrotondamento psicologico: N.90 o N.99 */
function commercialRound(value: number): number {
  const floor = Math.floor(value);
  if (floor + 0.90 >= value) return floor + 0.90;
  if (floor + 0.99 >= value) return floor + 0.99;
  return (floor + 1) + 0.90;
}

/** Applica formula: basePrice * 1.20, con conversione USD→EUR se necessario */
function applyFormula(basePrice: number, currency = 'EUR'): number {
  if (isNaN(basePrice) || basePrice <= 0) return NaN;
  const inEur = currency.toUpperCase() === 'USD' ? basePrice * USD_TO_EUR : basePrice;
  return commercialRound(inEur * MARKUP);
}

// ──────────────────────────────────────────────
// NORMALIZZAZIONE NOME — per matching fuzzy
// ──────────────────────────────────────────────
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // rimuovi accenti
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Calcola un semplice punteggio di somiglianza tra due nomi (0-1) */
function similarityScore(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Overlap di parole
  const wordsA = new Set(na.split(' ').filter(w => w.length > 2));
  const wordsB = new Set(nb.split(' ').filter(w => w.length > 2));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return union === 0 ? 0 : intersection / union;
}

// ──────────────────────────────────────────────
// LETTURA CSV
// ──────────────────────────────────────────────
interface CsvRow {
  name:     string;
  price:    number;  // prezzo finale già calcolato con formula
  rawPrice: number;  // prezzo originale CSV
  currency: string;
  source:   string;  // nome file
}

function readCsvDir(dir: string, defaultCurrency: string): CsvRow[] {
  const rows: CsvRow[] = [];

  let files: string[];
  try {
    files = readdirSync(dir).filter(f => extname(f).toLowerCase() === '.csv');
  } catch {
    log(C.yellow, 'WARN', `Directory non trovata: ${dir}`);
    return rows;
  }

  for (const file of files) {
    const filePath = join(dir, file);
    log(C.cyan, 'CSV', `Lettura: ${file}`);

    try {
      const workbook = XLSX.readFile(filePath);
      const sheet    = workbook.Sheets[workbook.SheetNames[0]];
      const data     = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

      for (const row of data) {
        // Normalizza le chiavi (rimuovi NFKD, spazi extra)
        const normalizedRow: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          const key = k.normalize('NFKD').replace(/\s+/g, '_').trim();
          normalizedRow[key] = String(v);
        }

        // Cerca il nome del prodotto
        const name = (
          normalizedRow['Prodotto'] ||
          normalizedRow['name'] ||
          normalizedRow['Name'] ||
          normalizedRow['PRODOTTO']
        )?.trim();

        if (!name) continue;

        // Cerca il prezzo e la valuta
        const priceRaw = (
          normalizedRow['Prezzo_USD'] ||
          normalizedRow['Prezzo'] ||
          normalizedRow['price'] ||
          normalizedRow['Price'] ||
          normalizedRow['PREZZO']
        )?.trim();

        const currencyCol = (
          normalizedRow['Valuta'] ||
          normalizedRow['currency'] ||
          normalizedRow['Currency'] ||
          ''
        ).trim().toUpperCase() || defaultCurrency;

        const parsedPrice = parsePrice(priceRaw ?? '');
        if (isNaN(parsedPrice)) {
          log(C.gray, 'SKIP', `${name} — prezzo non valido: "${priceRaw}"`);
          continue;
        }

        const finalPrice = applyFormula(parsedPrice, currencyCol);
        if (isNaN(finalPrice)) {
          log(C.gray, 'SKIP', `${name} — formula non applicabile`);
          continue;
        }

        rows.push({
          name,
          price:    finalPrice,
          rawPrice: parsedPrice,
          currency: currencyCol,
          source:   file,
        });
      }
    } catch (err) {
      log(C.red, 'ERRORE', `Impossibile leggere ${file}: ${err}`);
    }
  }

  return rows;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bright}${C.cyan}╔══════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bright}${C.cyan}║  MIGRATE-PRICES — Supabase Price Updater     ║${C.reset}`);
  console.log(`${C.bright}${C.cyan}╚══════════════════════════════════════════════╝${C.reset}\n`);

  if (DRY_RUN) {
    log(C.yellow, 'MODE', 'DRY-RUN — nessuna modifica al database. Usa --execute per applicare.');
  } else {
    log(C.red, 'MODE', 'EXECUTE — le modifiche verranno applicate al database!');
  }

  // 1. Leggi tutti i prodotti dal DB (id + name)
  log(C.blue, 'DB', 'Recupero prodotti dal database...');
  const { data: dbProducts, error } = await supabase
    .from('products')
    .select('id, name, price')
    .order('name');

  if (error) {
    log(C.red, 'ERRORE', `Impossibile recuperare prodotti: ${error.message}`);
    process.exit(1);
  }

  log(C.green, 'DB', `${dbProducts!.length} prodotti trovati nel database`);

  // 2. Leggi tutti i CSV
  const magazzinoCsvRows = readCsvDir(MAGAZZINO_DIR, 'USD');  // MAGAZZINO = prezzi USD
  const archivioRows     = readCsvDir(ARCHIVIO_DIR,  'EUR');  // ARCHIVIO.PROD = prezzi EUR

  const allCsvRows = [...magazzinoCsvRows, ...archivioRows];
  log(C.cyan, 'CSV', `${allCsvRows.length} righe caricate dai CSV`);

  if (allCsvRows.length === 0) {
    log(C.yellow, 'WARN', 'Nessun dato CSV trovato. Verifica le cartelle MAGAZZINO/ e ARCHIVIO.PROD/');
    process.exit(0);
  }

  // 3. Match + aggiornamento
  let updated  = 0;
  let skipped  = 0;
  let noMatch  = 0;
  const MATCH_THRESHOLD = 0.55; // soglia minima somiglianza nome

  const results: Array<{
    csvName:   string;
    dbName:    string;
    oldPrice:  number;
    newPrice:  number;
    score:     number;
    source:    string;
    status:    'updated' | 'skipped' | 'no_match';
  }> = [];

  for (const csvRow of allCsvRows) {
    // Trova il prodotto DB con la maggiore somiglianza al nome CSV
    let bestScore  = 0;
    let bestMatch: { id: string; name: string; price: number } | null = null;

    for (const dbProduct of dbProducts!) {
      const score = similarityScore(csvRow.name, dbProduct.name);
      if (score > bestScore) {
        bestScore  = score;
        bestMatch  = dbProduct;
      }
    }

    if (!bestMatch || bestScore < MATCH_THRESHOLD) {
      log(C.gray, 'NO MATCH', `"${csvRow.name}" (score massimo: ${(bestScore * 100).toFixed(0)}%)`);
      results.push({
        csvName:  csvRow.name,
        dbName:   bestMatch?.name ?? '—',
        oldPrice: bestMatch?.price ?? 0,
        newPrice: csvRow.price,
        score:    bestScore,
        source:   csvRow.source,
        status:   'no_match',
      });
      noMatch++;
      continue;
    }

    const oldPrice  = parseFloat(String(bestMatch.price ?? '0'));
    const newPrice  = csvRow.price;
    const priceChanged = Math.abs(oldPrice - newPrice) > 0.01;

    if (!priceChanged) {
      log(
        C.gray, 'INVARIATO',
        `"${bestMatch.name}" — €${newPrice.toFixed(2)} (match: ${(bestScore * 100).toFixed(0)}%)`,
      );
      results.push({ csvName: csvRow.name, dbName: bestMatch.name, oldPrice, newPrice, score: bestScore, source: csvRow.source, status: 'skipped' });
      skipped++;
      continue;
    }

    log(
      C.green, DRY_RUN ? 'DRY-RUN' : 'UPDATE',
      `"${bestMatch.name}" — €${oldPrice.toFixed(2)} → €${newPrice.toFixed(2)} (match ${(bestScore * 100).toFixed(0)}%, sorgente: ${csvRow.source})`,
    );

    if (!DRY_RUN) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ price: newPrice, is_price_pending: false })
        .eq('id', bestMatch.id);

      if (updateError) {
        log(C.red, 'ERRORE', `Aggiornamento fallito per "${bestMatch.name}": ${updateError.message}`);
      } else {
        updated++;
      }
    } else {
      updated++; // conta come "da aggiornare" in dry-run
    }

    results.push({ csvName: csvRow.name, dbName: bestMatch.name, oldPrice, newPrice, score: bestScore, source: csvRow.source, status: 'updated' });
  }

  // 4. Riepilogo
  console.log(`\n${C.bright}${'─'.repeat(60)}${C.reset}`);
  console.log(`${C.bright}RIEPILOGO${C.reset}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Da aggiornare : ${C.green}${C.bright}${updated}${C.reset}`);
  console.log(`  Invariati     : ${C.gray}${skipped}${C.reset}`);
  console.log(`  Nessun match  : ${C.yellow}${noMatch}${C.reset}`);
  console.log(`${'─'.repeat(60)}\n`);

  if (DRY_RUN && updated > 0) {
    console.log(`${C.yellow}${C.bright}→ Per applicare le ${updated} modifiche, esegui:${C.reset}`);
    console.log(`  ${C.cyan}npx tsx scripts/migrate-prices.ts --execute${C.reset}\n`);
  } else if (!DRY_RUN) {
    console.log(`${C.green}${C.bright}✓ ${updated} prezzi aggiornati nel database.${C.reset}\n`);
  }
}

main().catch((err) => {
  console.error(`${C.red}${C.bright}[FATALE]${C.reset}`, err);
  process.exit(1);
});
