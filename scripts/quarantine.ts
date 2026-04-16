/**
 * quarantine.ts — Kitwer26 Catalog Quarantine (Option 2)
 *
 * Rules applied:
 *   PRODUCTS → is_active = false if:
 *     1. image_url is NULL, empty, or does not start with http
 *     2. affiliate_url is NULL, empty, or does not start with http
 *     3. category is not one of the four valid categories
 *     4. duplicate image_url: keep only the one with the most realistic price
 *        and longest description; deactivate the rest
 *
 *   BLOG POSTS (file-based) → flagged as missing ogImage (featured_image)
 *     NOTE: Blog posts are file-based TypeScript objects — there is no
 *     blog_posts DB table. This script reports posts missing ogImage and
 *     counts them as blog_posts_hidden (no DB mutation possible for file-based posts).
 *
 * Run:
 *   npx tsx scripts/quarantine.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync }  from 'fs';
import { resolve }       from 'path';

// ── ENV LOADER ─────────────────────────────────────────────────────────────────
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
  } catch { /* use system env vars */ }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
);

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const VALID_CATEGORIES = new Set([
  'Sim Racing',
  'FPV Drones',
  'Crypto Wallets',
  'Smart Security',
]);

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Product {
  id:            number | string;
  name:          string | null;
  image_url:     string | null;
  affiliate_url: string | null;
  category:      string | null;
  price:         number | null;
  description:   string | null;
  is_active:     boolean | null;
}

// ── HELPERS ────────────────────────────────────────────────────────────────────
function isValidUrl(val: string | null | undefined): boolean {
  if (!val || val.trim() === '') return false;
  return val.trim().startsWith('http');
}

function descriptionLength(desc: string | null | undefined): number {
  return (desc ?? '').length;
}

/**
 * Determine which product in a duplicate group to keep active.
 * Winner = highest price that is still > 0 (most realistic = non-zero priced)
 * with description length as tiebreaker.
 */
function pickWinner(group: Product[]): Product {
  return group.reduce((best, cur) => {
    const bPrice = best.price ?? 0;
    const cPrice = cur.price  ?? 0;

    // Both valid: prefer higher price (more realistic), then longer description
    if (cPrice > 0 && bPrice > 0) {
      if (cPrice > bPrice) return cur;
      if (cPrice === bPrice && descriptionLength(cur.description) > descriptionLength(best.description)) return cur;
      return best;
    }
    // Prefer non-zero price
    if (cPrice > 0 && bPrice === 0) return cur;
    return best;
  });
}

// ── BLOG POSTS (file-based) ─────────────────────────────────────────────────
// Blog posts live in /content/blog/*.ts as TypeScript objects.
// There is no DB table for them. We load them directly from the source files
// and check for a missing ogImage field (the equivalent of featured_image).
interface BlogPostMeta {
  slug:     string;
  title:    string;
  ogImage?: string;
}

function loadBlogPostMeta(): BlogPostMeta[] {
  // We read the posts registry from lib/blog/posts.ts to get slugs,
  // then parse each content file for the ogImage field.
  const blogDir = resolve(process.cwd(), 'content/blog');
  const fs      = require('fs') as typeof import('fs');
  const path    = require('path') as typeof import('path');

  const posts: BlogPostMeta[] = [];

  let files: string[] = [];
  try {
    files = fs.readdirSync(blogDir).filter((f: string) => f.endsWith('.ts'));
  } catch {
    return posts;
  }

  for (const file of files) {
    const raw = fs.readFileSync(path.join(blogDir, file), 'utf-8');

    // Extract slug
    const slugMatch = raw.match(/slug\s*:\s*['"]([^'"]+)['"]/);
    const slug = slugMatch?.[1] ?? file.replace('.ts', '');

    // Extract title
    const titleMatch = raw.match(/title\s*:\s*['"]([^'"]+)['"]/);
    const title = titleMatch?.[1] ?? slug;

    // Extract ogImage (may be absent)
    const ogImageMatch = raw.match(/ogImage\s*:\s*['"]([^'"]+)['"]/);
    const ogImage = ogImageMatch?.[1];

    posts.push({ slug, title, ogImage });
  }

  return posts;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  QUARANTINE — Kitwer26 Catalog Sanitation (Option 2)');
  console.log('='.repeat(60) + '\n');

  // Track results
  let productsQuarantined  = 0;
  let blogPostsHidden      = 0;
  let duplicatesDeactivated = 0;
  const rulesApplied: string[] = [];

  // ── STEP 1: Load all products ──────────────────────────────────────────────
  console.log('Loading products from Supabase...');
  const { data: allProducts, error: fetchErr } = await supabase
    .from('products')
    .select('id, name, image_url, affiliate_url, category, price, description, is_active')
    .order('id');

  if (fetchErr) {
    console.error('FATAL — could not fetch products:', fetchErr.message);
    process.exit(1);
  }

  const products = (allProducts ?? []) as Product[];
  console.log(`  Loaded ${products.length} products\n`);

  // ── STEP 2: Collect IDs to deactivate per rule ────────────────────────────
  const toDeactivate = new Set<string | number>();

  // Rule A: bad image_url
  const badImage = products.filter(p => !isValidUrl(p.image_url));
  badImage.forEach(p => toDeactivate.add(p.id));
  if (badImage.length > 0) {
    console.log(`Rule A (bad image_url): ${badImage.length} products flagged`);
    rulesApplied.push(`image_url NULL/empty/non-http: ${badImage.length} products`);
  }

  // Rule B: bad affiliate_url
  const badAffiliate = products.filter(p => !isValidUrl(p.affiliate_url));
  badAffiliate.forEach(p => toDeactivate.add(p.id));
  if (badAffiliate.length > 0) {
    console.log(`Rule B (bad affiliate_url): ${badAffiliate.length} products flagged`);
    rulesApplied.push(`affiliate_url NULL/empty/non-http: ${badAffiliate.length} products`);
  }

  // Rule C: invalid category
  const badCategory = products.filter(p => !VALID_CATEGORIES.has(p.category ?? ''));
  badCategory.forEach(p => toDeactivate.add(p.id));
  if (badCategory.length > 0) {
    console.log(`Rule C (invalid category): ${badCategory.length} products flagged`);
    const cats = [...new Set(badCategory.map(p => p.category ?? 'NULL'))].join(', ');
    rulesApplied.push(`invalid category (found: ${cats}): ${badCategory.length} products`);
  }

  // Rule D: duplicate image_url — keep winner active, deactivate rest
  // Only considers products not already flagged for deactivation (no point deduplicating already-dead records)
  const alive = products.filter(p => !toDeactivate.has(p.id) && isValidUrl(p.image_url));

  const byImage = new Map<string, Product[]>();
  for (const p of alive) {
    const key = p.image_url!.trim();
    if (!byImage.has(key)) byImage.set(key, []);
    byImage.get(key)!.push(p);
  }

  const dupGroups = [...byImage.values()].filter(g => g.length > 1);
  let dupLosers   = 0;
  for (const group of dupGroups) {
    const winner = pickWinner(group);
    const losers = group.filter(p => p.id !== winner.id);
    losers.forEach(p => {
      toDeactivate.add(p.id);
      dupLosers++;
    });
    console.log(
      `Rule D (duplicate image_url): group of ${group.length} — keeping id=${winner.id}` +
      ` (price=${winner.price ?? 'null'}, desc=${descriptionLength(winner.description)} chars),` +
      ` deactivating [${losers.map(p => p.id).join(', ')}]`
    );
  }

  if (dupGroups.length > 0) {
    duplicatesDeactivated = dupLosers;
    rulesApplied.push(`duplicate image_url: ${dupGroups.length} groups, ${dupLosers} losers deactivated`);
  }

  // ── STEP 3: Apply deactivations in batches ────────────────────────────────
  const idsToDeactivate = [...toDeactivate];

  // Separate already-inactive to count only net new quarantines
  const alreadyInactive = products
    .filter(p => idsToDeactivate.includes(p.id) && p.is_active === false)
    .map(p => p.id);

  const newlyQuarantined = idsToDeactivate.filter(id => !alreadyInactive.includes(id as any));

  console.log(`\nTotal IDs to set is_active=false: ${idsToDeactivate.length}`);
  console.log(`  Already inactive (no-op): ${alreadyInactive.length}`);
  console.log(`  Net new quarantine: ${newlyQuarantined.length}`);

  if (idsToDeactivate.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < idsToDeactivate.length; i += BATCH) {
      const batch = idsToDeactivate.slice(i, i + BATCH);
      const { error: updateErr } = await supabase
        .from('products')
        .update({ is_active: false })
        .in('id', batch);

      if (updateErr) {
        console.error(`Batch update error (offset ${i}):`, updateErr.message);
        process.exit(1);
      }
    }
    console.log('  Products deactivated in DB: OK');
  }

  productsQuarantined = newlyQuarantined.length;

  // ── STEP 4: Blog posts (file-based — check ogImage) ───────────────────────
  console.log('\nChecking blog posts for missing ogImage (featured_image)...');
  const blogPosts = loadBlogPostMeta();
  const missingOgImage = blogPosts.filter(p => !p.ogImage || p.ogImage.trim() === '');

  blogPostsHidden = missingOgImage.length;
  if (missingOgImage.length > 0) {
    console.log(`  Blog posts missing ogImage: ${missingOgImage.length}`);
    missingOgImage.forEach(p =>
      console.log(`    - [${p.slug}] "${p.title}"`)
    );
    rulesApplied.push(
      `blog posts missing ogImage (featured_image): ${missingOgImage.length} posts` +
      ` [${missingOgImage.map(p => p.slug).join(', ')}]` +
      ' — file-based, no DB mutation (remove from posts registry to suppress)'
    );
  } else {
    console.log('  All blog posts have ogImage: OK');
  }

  // ── STEP 5: Final verification ─────────────────────────────────────────────
  const { count: activeAfter } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: inactiveAfter } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false);

  // ── REPORT ─────────────────────────────────────────────────────────────────
  const report = {
    products_quarantined:   productsQuarantined,
    blog_posts_hidden:      blogPostsHidden,
    duplicates_deactivated: duplicatesDeactivated,
    rules_applied:          rulesApplied,
    _meta: {
      total_products:        products.length,
      active_after:          activeAfter ?? 0,
      inactive_after:        inactiveAfter ?? 0,
      blog_posts_checked:    blogPosts.length,
      valid_categories:      [...VALID_CATEGORIES],
      executed_at:           new Date().toISOString(),
      note_blog: 'Blog posts are file-based (content/blog/*.ts). No DB table exists. ogImage = featured_image equivalent.',
    },
  };

  console.log('\n' + '='.repeat(60));
  console.log('  QUARANTINE REPORT');
  console.log('='.repeat(60));
  console.log(JSON.stringify(report, null, 2));
  console.log('='.repeat(60) + '\n');

  return report;
}

main().catch((e) => {
  console.error('FATAL:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});
