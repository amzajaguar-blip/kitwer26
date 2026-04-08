#!/usr/bin/env tsx
/**
 * cleanup-catalog.ts — Pulizia catalogo prodotti Kitwer26
 *
 * Operazioni (in ordine):
 *  1. Merge categorie duplicate → categoria principale
 *  2. Smista UNSORTED per sub_category
 *  3. Fix sub_category NULL → 'general'
 *  4. Merge sottocategorie con 1 solo prodotto → 'general'
 *
 * Run standalone: npx tsx scripts/cleanup-catalog.ts [--dry-run]
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

// ─── Env ──────────────────────────────────────────────────────────────────────

function loadEnv(): void {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && !process.env[key]) process.env[key] = val;
    }
  } catch { /* .env.local assente — usa variabili di sistema */ }
}

// ─── Tipi pubblici ─────────────────────────────────────────────────────────────

export interface CleanupLog {
  action: string;
  count:  number;
  detail: string;
  level:  'info' | 'success' | 'error';
}

export interface CleanupStats {
  categoriesMerged:     number;
  nullsFixed:           number;
  sparseMerged:         number;
  totalProductsAffected: number;
}

export interface CleanupResult {
  logs:  CleanupLog[];
  stats: CleanupStats;
}

// ─── Regole di merge ──────────────────────────────────────────────────────────

const CATEGORY_MERGES = [
  { from: 'sicurezza-domotica-high-end', to: 'Smart Security' },
  { from: 'pc-hardware-high-ticket',     to: 'PC Hardware'    },
  { from: 'comms-security-shield',       to: 'Smart Security' },
] as const;

/** UNSORTED: smista per sub_category */
const UNSORTED_RULES: Array<{ sub: string; toCategory: string }> = [
  { sub: 'shifters-handbrakes', toCategory: 'sim-racing-accessories-premium'              },
  { sub: '*',                   toCategory: 'trading-gaming-desk-accessories-premium'     },
];

const BATCH_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchIds(
  sb:       SupabaseClient,
  filters:  Record<string, string | null>,
): Promise<string[]> {
  let q = sb.from('products').select('id');
  for (const [col, val] of Object.entries(filters)) {
    if (val === null) q = q.is(col, null);
    else              q = q.eq(col, val);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { id: string }) => r.id);
}

async function updateBatched(
  sb:      SupabaseClient,
  ids:     string[],
  payload: Record<string, string | null>,
): Promise<void> {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { error } = await sb.from('products').update(payload).in('id', batch);
    if (error) throw new Error(error.message);
  }
}

// ─── Step 1: merge categorie ──────────────────────────────────────────────────

async function stepMergeCategories(
  sb:        SupabaseClient,
  isDryRun:  boolean,
  logs:      CleanupLog[],
  stats:     CleanupStats,
): Promise<void> {
  for (const { from, to } of CATEGORY_MERGES) {
    try {
      const ids = await fetchIds(sb, { category: from });
      if (ids.length === 0) {
        logs.push({ action: 'merge-category', count: 0, detail: `${from} — nessun prodotto, skip`, level: 'info' });
        continue;
      }
      if (!isDryRun) await updateBatched(sb, ids, { category: to });
      const verb = isDryRun ? '[DRY RUN] sposterebbe' : 'spostati';
      logs.push({ action: 'merge-category', count: ids.length, detail: `${from} → ${to}: ${ids.length} prodotti ${verb}`, level: isDryRun ? 'info' : 'success' });
      stats.categoriesMerged     += ids.length;
      stats.totalProductsAffected += ids.length;
    } catch (e) {
      logs.push({ action: 'merge-category', count: 0, detail: `Errore su ${from}: ${(e as Error).message}`, level: 'error' });
    }
  }
}

// ─── Step 2: smista UNSORTED ──────────────────────────────────────────────────

async function stepUnsorted(
  sb:       SupabaseClient,
  isDryRun: boolean,
  logs:     CleanupLog[],
  stats:    CleanupStats,
): Promise<void> {
  try {
    // Regole specifiche per sub_category
    for (const rule of UNSORTED_RULES) {
      if (rule.sub === '*') continue; // wildcard gestita dopo
      const ids = await fetchIds(sb, { category: 'UNSORTED', sub_category: rule.sub });
      if (ids.length === 0) continue;
      if (!isDryRun) await updateBatched(sb, ids, { category: rule.toCategory });
      const verb = isDryRun ? '[DRY RUN] sposterebbe' : 'spostati';
      logs.push({ action: 'unsorted-specific', count: ids.length, detail: `UNSORTED/${rule.sub} → ${rule.toCategory}: ${ids.length} prodotti ${verb}`, level: isDryRun ? 'info' : 'success' });
      stats.categoriesMerged      += ids.length;
      stats.totalProductsAffected += ids.length;
    }

    // Wildcard: tutto il resto di UNSORTED → trading-gaming
    const wildcardTarget = UNSORTED_RULES.find(r => r.sub === '*')!.toCategory;
    const remainingIds   = await fetchIds(sb, { category: 'UNSORTED' });
    if (remainingIds.length > 0) {
      if (!isDryRun) await updateBatched(sb, remainingIds, { category: wildcardTarget });
      const verb = isDryRun ? '[DRY RUN] sposterebbe' : 'spostati';
      logs.push({ action: 'unsorted-wildcard', count: remainingIds.length, detail: `UNSORTED (resto) → ${wildcardTarget}: ${remainingIds.length} prodotti ${verb}`, level: isDryRun ? 'info' : 'success' });
      stats.categoriesMerged      += remainingIds.length;
      stats.totalProductsAffected += remainingIds.length;
    }
  } catch (e) {
    logs.push({ action: 'unsorted', count: 0, detail: `Errore UNSORTED: ${(e as Error).message}`, level: 'error' });
  }
}

// ─── Step 3: fix NULL sub_category ───────────────────────────────────────────

async function stepFixNulls(
  sb:       SupabaseClient,
  isDryRun: boolean,
  logs:     CleanupLog[],
  stats:    CleanupStats,
): Promise<void> {
  try {
    const ids = await fetchIds(sb, { sub_category: null });
    if (ids.length === 0) {
      logs.push({ action: 'fix-nulls', count: 0, detail: 'Nessuna sub_category NULL trovata', level: 'info' });
      return;
    }
    if (!isDryRun) await updateBatched(sb, ids, { sub_category: 'general' });
    const verb = isDryRun ? '[DRY RUN] sistemerebbe' : 'sistemati';
    logs.push({ action: 'fix-nulls', count: ids.length, detail: `sub_category NULL → 'general': ${ids.length} prodotti ${verb}`, level: isDryRun ? 'info' : 'success' });
    stats.nullsFixed            += ids.length;
    stats.totalProductsAffected += ids.length;
  } catch (e) {
    logs.push({ action: 'fix-nulls', count: 0, detail: `Errore fix NULL: ${(e as Error).message}`, level: 'error' });
  }
}

// ─── Step 4: merge sottocategorie sparse (1 prodotto) ────────────────────────

async function stepMergeSparse(
  sb:       SupabaseClient,
  isDryRun: boolean,
  logs:     CleanupLog[],
  stats:    CleanupStats,
): Promise<void> {
  try {
    // Conta prodotti per (category, sub_category)
    const { data, error } = await sb
      .from('products')
      .select('category, sub_category');
    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of (data ?? [])) {
      const key = `${row.category}||${row.sub_category ?? ''}`;
      counts[key] = (counts[key] ?? 0) + 1;
    }

    const sparse = Object.entries(counts).filter(([key, cnt]) => {
      const sub = key.split('||')[1];
      return cnt === 1 && sub && sub !== 'general';
    });

    if (sparse.length === 0) {
      logs.push({ action: 'merge-sparse', count: 0, detail: 'Nessuna sottocategoria con 1 solo prodotto', level: 'info' });
      return;
    }

    let totalMerged = 0;
    for (const [key] of sparse) {
      const [category, sub_category] = key.split('||');
      try {
        const ids = await fetchIds(sb, { category, sub_category });
        if (ids.length === 0) continue;
        if (!isDryRun) await updateBatched(sb, ids, { sub_category: 'general' });
        totalMerged++;
        stats.sparseMerged          += ids.length;
        stats.totalProductsAffected += ids.length;
      } catch (e) {
        logs.push({ action: 'merge-sparse', count: 0, detail: `Errore su ${category}/${sub_category}: ${(e as Error).message}`, level: 'error' });
      }
    }

    const verb = isDryRun ? '[DRY RUN] mergerebbe' : 'mergeati';
    logs.push({ action: 'merge-sparse', count: totalMerged, detail: `${totalMerged} sottocategorie sparse (1 prodotto) ${verb} in 'general'`, level: isDryRun ? 'info' : 'success' });
  } catch (e) {
    logs.push({ action: 'merge-sparse', count: 0, detail: `Errore analisi sparse: ${(e as Error).message}`, level: 'error' });
  }
}

// ─── Entry point esportato ────────────────────────────────────────────────────

export async function runCleanup(isDryRun = false): Promise<CleanupResult> {
  loadEnv();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti');

  const sb: SupabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  });

  const logs:  CleanupLog[]  = [];
  const stats: CleanupStats  = { categoriesMerged: 0, nullsFixed: 0, sparseMerged: 0, totalProductsAffected: 0 };

  logs.push({ action: 'start', count: 0, detail: isDryRun ? '=== DRY RUN — nessun dato verrà modificato ===' : '=== PULIZIA CATALOGO AVVIATA ===', level: 'info' });

  await stepMergeCategories(sb, isDryRun, logs, stats);
  await stepUnsorted(sb, isDryRun, logs, stats);
  await stepFixNulls(sb, isDryRun, logs, stats);
  await stepMergeSparse(sb, isDryRun, logs, stats);

  logs.push({
    action: 'done',
    count:  stats.totalProductsAffected,
    detail: `=== COMPLETATO — ${stats.totalProductsAffected} prodotti ${isDryRun ? 'sarebbero stati' : ''} modificati ===`,
    level:  'success',
  });

  return { logs, stats };
}

// ─── Standalone ───────────────────────────────────────────────────────────────

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  runCleanup(isDryRun)
    .then(({ logs, stats }) => {
      for (const l of logs) console.log(`[${l.level.toUpperCase()}] ${l.detail}`);
      console.log('\nStats:', stats);
      process.exit(0);
    })
    .catch((e) => {
      console.error('FATAL:', e);
      process.exit(1);
    });
}
