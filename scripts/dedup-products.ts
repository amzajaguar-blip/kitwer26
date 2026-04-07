/**
 * dedup-products.ts — De-duplicazione intelligente prodotti Supabase
 *
 * Logica:
 *  1. Raggruppa prodotti che condividono image_urls[0]
 *  2. Master = record con nome più lungo
 *  3. Titoli duplicati → opzioni in variants JSONB ("Variante Titolo")
 *  4. Description duplicati → unificati senza ripetizioni nel master
 *  5. image_urls → unione di tutti gli array (dedup)
 *  6. Slug SEO unico generato dal nome master
 *  7. Duplicati eliminati dal DB
 *
 * Run:
 *   npx tsx scripts/dedup-products.ts              ← analisi + fix
 *   npx tsx scripts/dedup-products.ts --dry-run    ← solo report, nessuna modifica
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

// ── TERMINALE ─────────────────────────────────────────────────────────────────
const C = { reset:'\x1b[0m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', gray:'\x1b[90m', bright:'\x1b[1m', magenta:'\x1b[35m' };
const log = (color: string, tag: string, msg: string) =>
  console.log(`${C.gray}${new Date().toLocaleTimeString('it-IT')}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);

// ── TIPI ──────────────────────────────────────────────────────────────────────
interface Variant { name: string; values: string[]; images?: Record<string, string> }

interface Product {
  id:           string;
  name:         string;
  description:  string | null;
  image_url:    string | null;
  image_urls:   string[] | null;
  affiliate_url: string | null;
  category:     string | null;
  price:        number | null;
  variants:     Variant[] | null;
  slug:         string | null;
}

// ── SLUG ──────────────────────────────────────────────────────────────────────
function makeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ── UNISCI DESCRIPTION (rimuove frasi duplicate) ──────────────────────────────
function mergeDescriptions(descs: string[]): string {
  const clean = descs
    .map((d) => d.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean[0];

  // Suddividi in frasi, dedup, ricomponi
  const allSentences = clean.flatMap((d) =>
    d.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 10)
  );
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const s of allSentences) {
    const key = s.toLowerCase().slice(0, 40);
    if (!seen.has(key)) { seen.add(key); unique.push(s); }
  }
  return unique.join(' ');
}

// ── ESTRAI DIFFERENZE TRA TITOLI → opzioni variante ──────────────────────────
function extractTitleVariants(masterName: string, dupNames: string[]): string[] {
  const options = new Set<string>();
  // Aggiungi master stesso come prima opzione
  options.add(masterName.trim());
  for (const dup of dupNames) {
    const t = dup.trim();
    if (t && t !== masterName) options.add(t);
  }
  return [...options];
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\n${C.bright}${C.cyan}${'━'.repeat(58)}${C.reset}`);
  console.log(`${C.bright}${C.cyan}   DEDUP-PRODUCTS — De-duplicazione intelligente${C.reset}`);
  console.log(`${C.bright}${dryRun ? C.yellow : C.green}   Modalità: ${dryRun ? 'DRY RUN (no modifiche)' : 'LIVE (salva su DB)'}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'━'.repeat(58)}${C.reset}\n`);

  // 1. Carica tutti i prodotti
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, image_url, image_urls, affiliate_url, category, price, variants, slug')
    .order('name');

  if (error) { log(C.red, 'FATAL', error.message); process.exit(1); }
  if (!products?.length) { log(C.yellow, 'INFO', 'Nessun prodotto'); return; }

  log(C.cyan, 'SCAN', `${products.length} prodotti caricati\n`);

  // 2. Raggruppa per image_urls[0]
  const groups = new Map<string, Product[]>();

  for (const p of products as Product[]) {
    const key = Array.isArray(p.image_urls) && p.image_urls.length > 0
      ? p.image_urls[0]
      : (p.image_url ?? `__no_img_${p.id}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // 2b. Secondo passaggio: raggruppa anche per affiliate_url normalizzato
  // (stesso prodotto Amazon, prezzi diversi → duplicato da risolvere)
  const normalizeUrl = (url: string) =>
    url.replace(/[?&](tag|linkCode|ascsubtag|ref|qid|sr|keywords)[^&]*/g, '')
       .replace(/[?&]$/, '')
       .replace(/\/$/, '');

  const alreadyGrouped = new Set<string>();
  for (const group of groups.values()) {
    if (group.length > 1) group.forEach(p => alreadyGrouped.add(String(p.id)));
  }

  const byUrl = new Map<string, Product[]>();
  for (const p of products as Product[]) {
    if (!p.affiliate_url || alreadyGrouped.has(String(p.id))) continue;
    const key = `url:${normalizeUrl(p.affiliate_url)}`;
    if (!byUrl.has(key)) byUrl.set(key, []);
    byUrl.get(key)!.push(p);
  }

  for (const [key, group] of byUrl.entries()) {
    if (group.length > 1) {
      log(C.magenta, 'URL-DUP', `Gruppo ${group.length} per URL: ${key.slice(4, 70)}`);
      groups.set(key, group);
    }
  }

  // 3. Filtra gruppi con più di 1 prodotto
  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  log(C.yellow, 'DUPLICATI', `${dupGroups.length} gruppi con duplicati trovati`);

  if (dupGroups.length === 0) {
    log(C.green, 'OK', 'Nessun duplicato — database già pulito!');
    return;
  }

  let totalMerged   = 0;
  let totalDeleted  = 0;
  let totalSkipped  = 0;

  for (const group of dupGroups) {
    // Master = prezzo più basso (o ID più piccolo come tiebreaker per stabilità)
    const sorted = [...group].sort((a, b) => {
      const pa = a.price ?? Infinity;
      const pb = b.price ?? Infinity;
      if (pa !== pb) return pa - pb;
      return String(a.id).localeCompare(String(b.id));
    });
    const master  = sorted[0];
    const dups    = sorted.slice(1);

    console.log(`\n${C.bright}${C.yellow}── GRUPPO (${group.length} prodotti) ──${C.reset}`);
    log(C.green,  'MASTER', `"${master.name}" [${String(master.id).slice(0,8)}]`);
    dups.forEach((d) => log(C.gray, 'DUP', `"${d.name}" [${String(d.id).slice(0,8)}]`));

    // ── Varianti: titoli diversi dal master ─────────────────────────────────
    const dupNames    = dups.map((d) => d.name);
    const titleValues = extractTitleVariants(master.name, dupNames);
    const existingVariants: Variant[] = Array.isArray(master.variants) ? master.variants : [];

    // Cerca se c'è già una variante "Modello" o "Versione", altrimenti aggiungi
    const VARIANT_NAME = 'Versione';
    const existingIdx  = existingVariants.findIndex((v) => v.name === VARIANT_NAME);
    let mergedVariants = [...existingVariants];

    if (titleValues.length > 1) {
      if (existingIdx >= 0) {
        // Fonde con i valori esistenti
        const combined = [...new Set([...mergedVariants[existingIdx].values, ...titleValues])];
        mergedVariants[existingIdx] = { ...mergedVariants[existingIdx], values: combined };
      } else {
        mergedVariants.push({ name: VARIANT_NAME, values: titleValues });
      }
      log(C.cyan, 'VARIANTS', `Opzioni "${VARIANT_NAME}": [${titleValues.join(', ')}]`);
    }

    // ── Descrizioni: unisci senza ripetizioni ────────────────────────────────
    const allDescs = [master.description ?? '', ...dups.map((d) => d.description ?? '')];
    const mergedDesc = mergeDescriptions(allDescs);

    // ── image_urls: unione dedup ─────────────────────────────────────────────
    const allUrls = [
      ...(master.image_urls ?? []),
      ...dups.flatMap((d) => d.image_urls ?? []),
    ];
    const mergedUrls = [...new Set(allUrls.filter(Boolean))];

    // ── Slug SEO unico ───────────────────────────────────────────────────────
    const baseSlug = makeSlug(master.name);
    // Verifica unicità aggiungendo suffisso se necessario
    let finalSlug = baseSlug;
    const { data: slugCheck } = await supabase
      .from('products')
      .select('id')
      .eq('slug', baseSlug)
      .neq('id', master.id)
      .maybeSingle();
    if (slugCheck) finalSlug = `${baseSlug}-${String(master.id).slice(0, 6)}`;
    log(C.magenta, 'SLUG', finalSlug);

    if (!dryRun) {
      // ── Aggiorna master ──────────────────────────────────────────────────
      const { error: updateErr } = await supabase
        .from('products')
        .update({
          variants:    mergedVariants,
          description: mergedDesc || master.description,
          image_urls:  mergedUrls,
          image_url:   mergedUrls[0] ?? master.image_url,
          slug:        finalSlug,
        })
        .eq('id', master.id);

      if (updateErr) {
        log(C.red, 'UPDATE ERR', updateErr.message);
        totalSkipped++;
        continue;
      }

      // ── Elimina duplicati ────────────────────────────────────────────────
      const dupIds = dups.map((d) => d.id);
      const { error: deleteErr } = await supabase
        .from('products')
        .delete()
        .in('id', dupIds);

      if (deleteErr) {
        log(C.red, 'DELETE ERR', deleteErr.message);
        totalSkipped++;
        continue;
      }

      log(C.green, 'DONE', `Master aggiornato, ${dupIds.length} duplicati eliminati`);
      totalDeleted += dupIds.length;
      totalMerged++;
    } else {
      log(C.yellow, 'DRY-RUN', `Avrebbe aggiornato master + eliminato ${dups.length} duplicati`);
      totalMerged++;
    }
  }

  // ── RIEPILOGO ─────────────────────────────────────────────────────────────
  console.log(`\n${C.bright}${C.cyan}${'─'.repeat(58)}${C.reset}`);
  console.log(`${C.bright}${C.green}  Gruppi processati : ${totalMerged}${C.reset}`);
  console.log(`${C.bright}${C.red}   Record eliminati  : ${totalDeleted}${C.reset}`);
  if (totalSkipped > 0)
    console.log(`${C.bright}${C.yellow}  Saltati (errori)  : ${totalSkipped}${C.reset}`);
  if (dryRun)
    console.log(`${C.bright}${C.yellow}  DRY RUN — nessuna modifica al DB${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'─'.repeat(58)}${C.reset}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
