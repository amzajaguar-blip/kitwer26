/**
 * dedup-and-clean.ts — Remove duplicate products + deactivate no-image products
 *
 * Task 1: Find duplicates by slug OR (name + category), keep best, delete rest
 * Task 2: Set is_active=false for products with null/empty image_url
 *
 * Run: npx tsx scripts/dedup-and-clean.ts
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
  } catch { /* use system env */ }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
);

interface Product {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  image_url: string | null;
  affiliate_url: string | null;
  is_active: boolean | null;
  price: number | null;
}

function scoreProd(p: Product): number {
  let score = 0;
  if (p.is_active === true) score += 100;
  if (p.affiliate_url) score += 10;
  if (p.image_url && p.image_url.length > 0) score += 10;
  if (p.price && p.price > 0) score += 5;
  return score;
}

function pickBest(group: Product[]): { keep: Product; remove: Product[] } {
  const sorted = [...group].sort((a, b) => {
    const sa = scoreProd(a);
    const sb = scoreProd(b);
    if (sb !== sa) return sb - sa; // higher score first
    // tie-break: lower id = earlier import
    return String(a.id).localeCompare(String(b.id));
  });
  return { keep: sorted[0], remove: sorted.slice(1) };
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  DEDUP-AND-CLEAN — Duplicate removal + no-image deactivation');
  console.log('='.repeat(60) + '\n');

  // ── Load all products ──────────────────────────────────────────────────────
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, category, image_url, affiliate_url, is_active, price')
    .order('id');

  if (error) { console.error('FATAL:', error.message); process.exit(1); }
  if (!products?.length) { console.log('No products found.'); return; }

  console.log(`Loaded ${products.length} products.\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // TASK 1: Remove duplicates
  // ══════════════════════════════════════════════════════════════════════════
  console.log('--- TASK 1: Duplicate removal ---\n');

  const toDelete = new Set<string>();

  // Pass 1: Group by slug
  const bySlug = new Map<string, Product[]>();
  for (const p of products as Product[]) {
    if (!p.slug) continue;
    const key = p.slug.toLowerCase().trim();
    if (!key) continue;
    if (!bySlug.has(key)) bySlug.set(key, []);
    bySlug.get(key)!.push(p);
  }

  let slugDupGroups = 0;
  for (const [slug, group] of bySlug) {
    if (group.length <= 1) continue;
    slugDupGroups++;
    const { keep, remove } = pickBest(group);
    console.log(`[SLUG-DUP] "${slug}" — ${group.length} products, keeping id=${String(keep.id).slice(0,8)}`);
    for (const r of remove) {
      console.log(`  -> DELETE id=${String(r.id).slice(0,8)} "${r.name}"`);
      toDelete.add(r.id);
    }
  }

  // Pass 2: Group by (name, category) — skip already-marked for deletion
  const byNameCat = new Map<string, Product[]>();
  for (const p of products as Product[]) {
    if (toDelete.has(p.id)) continue;
    const key = `${(p.name || '').toLowerCase().trim()}|||${(p.category || '').toLowerCase().trim()}`;
    if (!byNameCat.has(key)) byNameCat.set(key, []);
    byNameCat.get(key)!.push(p);
  }

  let nameCatDupGroups = 0;
  for (const [key, group] of byNameCat) {
    if (group.length <= 1) continue;
    nameCatDupGroups++;
    const { keep, remove } = pickBest(group);
    console.log(`[NAME+CAT-DUP] "${key}" — ${group.length} products, keeping id=${String(keep.id).slice(0,8)}`);
    for (const r of remove) {
      console.log(`  -> DELETE id=${String(r.id).slice(0,8)} "${r.name}"`);
      toDelete.add(r.id);
    }
  }

  console.log(`\nSlug duplicate groups: ${slugDupGroups}`);
  console.log(`Name+Category duplicate groups: ${nameCatDupGroups}`);
  console.log(`Total products to delete: ${toDelete.size}\n`);

  // Delete in batches of 50
  if (toDelete.size > 0) {
    const ids = [...toDelete];
    let deleted = 0;
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50);
      const { error: delErr } = await supabase
        .from('products')
        .delete()
        .in('id', batch);
      if (delErr) {
        console.error(`DELETE ERROR (batch ${i}):`, delErr.message);
      } else {
        deleted += batch.length;
      }
    }
    console.log(`Deleted ${deleted} duplicate products.\n`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TASK 2: Deactivate products with no image
  // ══════════════════════════════════════════════════════════════════════════
  console.log('--- TASK 2: Deactivate no-image products ---\n');

  // Re-query to get current state after deletions
  const { data: active, error: activeErr } = await supabase
    .from('products')
    .select('id, name, image_url, is_active')
    .eq('is_active', true);

  if (activeErr) { console.error('Query error:', activeErr.message); process.exit(1); }

  const noImage = (active ?? []).filter(
    (p: any) => !p.image_url || p.image_url.trim() === ''
  );

  console.log(`Active products: ${active?.length ?? 0}`);
  console.log(`Active products with no image: ${noImage.length}\n`);

  if (noImage.length > 0) {
    const noImgIds = noImage.map((p: any) => p.id);

    // Log first 20
    for (const p of noImage.slice(0, 20)) {
      console.log(`  [NO-IMG] id=${String(p.id).slice(0,8)} "${p.name}"`);
    }
    if (noImage.length > 20) console.log(`  ... and ${noImage.length - 20} more`);

    // Deactivate in batches
    let deactivated = 0;
    for (let i = 0; i < noImgIds.length; i += 50) {
      const batch = noImgIds.slice(i, i + 50);
      const { error: upErr } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', batch);
      if (upErr) {
        console.error(`UPDATE ERROR (batch ${i}):`, upErr.message);
      } else {
        deactivated += batch.length;
      }
    }
    console.log(`\nDeactivated ${deactivated} products with no image.\n`);
  } else {
    console.log('All active products have images. No action needed.\n');
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Duplicates deleted: ${toDelete.size}`);
  console.log(`  No-image deactivated: ${noImage.length}`);
  console.log('='.repeat(60) + '\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
