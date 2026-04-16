/**
 * GET /api/search/suggest?q=...
 * Restituisce fino a 5 prodotti + categorie correlate per il dropdown SmartSearch.
 * Word-split ILIKE per matching multi-parola (es. "FPV Drone" → nome contiene FPV AND Drone).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const CATEGORY_LABELS: Record<string, string> = {
  'Crypto Wallets': 'Crypto Wallets',
  'FPV Drones':     'FPV Drones',
  'Sim Racing':     'Sim Racing',
  'Cyber Security': 'Cyber Security',
  // legacy slugs still present in DB — mapped for display only
  'fpv-drones-tech': 'FPV Drones',
};

const getSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const sb = getSupabase();

  // Word-split: ogni parola deve apparire nel nome → AND semantics
  const words = q.split(/\s+/).filter(Boolean).slice(0, 4);

  let productsQuery = sb
    .from('products')
    .select('id, name, category, image_url, price')
    .eq('is_active', true);

  for (const word of words) {
    productsQuery = productsQuery.ilike('name', `%${word}%`);
  }

  // Categoria per le suggestions (only active products)
  let catQuery = sb
    .from('products')
    .select('category')
    .eq('is_active', true)
    .not('category', 'is', null);

  for (const word of words) {
    catQuery = catQuery.ilike('name', `%${word}%`);
  }

  const [{ data: products }, { data: catRows }] = await Promise.all([
    productsQuery.order('price', { ascending: true }).limit(5),
    catQuery.limit(30),
  ]);

  const catSet = new Set<string>(
    (catRows ?? []).map((r: { category: string }) => r.category).filter(Boolean)
  );
  const categories = [...catSet].slice(0, 3).map(id => ({
    id,
    label: CATEGORY_LABELS[id] ?? id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }));

  return NextResponse.json(
    { products: products ?? [], categories },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
