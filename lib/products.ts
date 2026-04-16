import { supabase } from './supabase';
import { Product } from '@/types/product';

export type Category =
  | 'all'
  // ── 4 categorie canoniche ──────────────────────────────────────────────────
  | 'Sim Racing'
  | 'FPV Drones'
  | 'Crypto Wallets'
  | 'Cyber Security'
  // ── Legacy slug DB (fpv-drones-tech ancora presente in Supabase) ──────────
  | 'fpv-drones-tech'
  // prodotti importati ma non ancora classificati
  | 'UNSORTED';

/** Value used by importer to mark uncategorized rows */
export const UNSORTED_CAT: Category = 'UNSORTED';

export const PAGE_SIZE = 12;

/**
 * Sub-categorie per ogni macro-categoria.
 * - id   → slug URL-safe (es. "backup-seed") usato in /?sub=backup-seed
 * - label → testo UI
 * Fallback: se un prodotto non corrisponde a nessuna regola, sub_category = 'general'
 */
export const SUB_CATEGORIES: Record<string, { id: string; label: string; slug: string }[]> = {
  'Crypto Wallets': [
    { id: 'entry-level', label: 'Entry Level', slug: 'entry-level' },
    { id: 'premium',     label: 'Premium',     slug: 'premium' },
    { id: 'air-gapped',  label: 'Air-Gapped',  slug: 'air-gapped' },
    { id: 'backup-seed', label: 'Backup Seed', slug: 'backup-seed' },
    { id: 'general',     label: 'General',     slug: 'general' },
  ],
  'Cyber Security': [
    { id: 'hardware-keys',  label: 'Hardware Keys',  slug: 'hardware-keys' },
    { id: 'vpn-routers',    label: 'VPN Routers',    slug: 'vpn-routers' },
    { id: 'faraday-rfid',   label: 'Faraday & RFID', slug: 'faraday-rfid' },
    { id: 'privacy-tools',  label: 'Privacy Tools',  slug: 'privacy-tools' },
    { id: 'general',        label: 'General',        slug: 'general' },
  ],
  'Sim Racing': [
    { id: 'steering-wheels', label: 'Steering Wheels', slug: 'steering-wheels' },
    { id: 'pedals',          label: 'Pedals',          slug: 'pedals' },
    { id: 'shifters',        label: 'Shifters',         slug: 'shifters' },
    { id: 'cockpit-rigs',    label: 'Cockpits & Rigs', slug: 'cockpit-rigs' },
    { id: 'handbrakes',      label: 'Handbrakes',      slug: 'handbrakes' },
    { id: 'general',         label: 'General',         slug: 'general' },
  ],
  'FPV Drones': [
    { id: 'rtf-kits',           label: 'RTF Kits',            slug: 'rtf-kits' },
    { id: 'bnf-drones',         label: 'BNF Drones',          slug: 'bnf-drones' },
    { id: 'fpv-goggles',        label: 'FPV Goggles',         slug: 'fpv-goggles' },
    { id: 'radios-elrs',        label: 'Radios ELRS',         slug: 'radios-elrs' },
    { id: 'batteries-chargers', label: 'Batteries & Chargers',slug: 'batteries-chargers' },
    { id: 'frames',             label: 'Frames',              slug: 'frames' },
    { id: 'motors',             label: 'Motors',              slug: 'motors' },
    { id: 'vtx-cameras',        label: 'VTX & Cameras',       slug: 'vtx-cameras' },
    { id: 'general',            label: 'General',             slug: 'general' },
  ],
  // Legacy DB slug — still has active products in Supabase
  'fpv-drones-tech': [
    { id: 'rtf-kits',           label: 'RTF Kits',            slug: 'rtf-kits' },
    { id: 'bnf-drones',         label: 'BNF Drones',          slug: 'bnf-drones' },
    { id: 'fpv-goggles',        label: 'FPV Goggles',         slug: 'fpv-goggles' },
    { id: 'radios-elrs',        label: 'Radios ELRS',         slug: 'radios-elrs' },
    { id: 'batteries-chargers', label: 'Batteries & Chargers',slug: 'batteries-chargers' },
    { id: 'frames',             label: 'Frames',              slug: 'frames' },
    { id: 'motors',             label: 'Motors',              slug: 'motors' },
    { id: 'vtx-cameras',        label: 'VTX & Cameras',       slug: 'vtx-cameras' },
    { id: 'general',            label: 'General',             slug: 'general' },
  ],
};

/**
 * Slug helper: dato un id di sotto-categoria, restituisce lo slug URL-safe.
 * Uguale all'id stesso (già slug), ma esposto come funzione per coerenza.
 * Uso: /category/${getSubCategorySlug(sub)} → /category/backup-seed
 */
export function getSubCategorySlug(subId: string): string {
  return subId; // gli id sono già slug (es. 'backup-seed', 'air-gapped')
}

/**
 * Recupera la definizione di una sotto-categoria per categoria + slug.
 * Ritorna undefined se non trovata.
 */
export function getSubCategoryDef(category: string, slug: string) {
  return SUB_CATEGORIES[category]?.find((s) => s.slug === slug);
}

// ─── Mappa cross-selling: per ogni categoria "core", le categorie "accessori" suggerite ───
const COMPLEMENTARY_MAP: Record<string, string[]> = {
  'Crypto Wallets': ['Cyber Security', 'Sim Racing'],
  'Cyber Security': ['Crypto Wallets', 'FPV Drones'],
  'FPV Drones':     ['Sim Racing', 'Cyber Security'],
  'Sim Racing':     ['FPV Drones', 'Crypto Wallets'],
  // legacy DB slug
  'fpv-drones-tech': ['Sim Racing', 'Cyber Security'],
};

/** Restituisce le categorie complementari da mostrare come "prodotti correlati". */
export function getRelatedCategories(category: string): string[] {
  return COMPLEMENTARY_MAP[category] ?? [];
}

/**
 * Verifica se l'URL immagine è valido.
 * Le vere immagini Amazon hanno formato: .../images/I/71abc._AC_SL1500_.jpg (contengono '._')
 * I fallback rotti dell'importer hanno formato: .../images/I/B0XXXXXXXXXX.jpg (senza '._')
 */
function hasValidImage(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;
  if (imageUrl.includes('m.media-amazon.com') && !imageUrl.includes('._')) return false;
  return true;
}

/** Recupera prodotti correlati (da categorie complementari, o dalla stessa categoria come fallback). */
export async function fetchRelatedProducts(
  category: string,
  currentId: string,
  limit = 4,
): Promise<Product[]> {
  const relatedCats = getRelatedCategories(category);
  // Se non ci sono categorie complementari mappa, usa la stessa categoria
  const searchCats = relatedCats.length > 0 ? relatedCats : [category];

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, description, image_url, image_urls, product_url, price')
    .in('category', searchCats)
    .eq('is_active', true)
    .neq('id', currentId)
    .not('image_url', 'is', null)
    .limit(limit);

  if (error) {
    console.error('[fetchRelatedProducts] Errore Supabase:', error.message);
    return [];
  }

  return ((data ?? []) as Product[]).filter((p) => hasValidImage(p.image_url));
}

// ─── Tactical Deals ──────────────────────────────────────────────────────────────

export interface TacticalDeal {
  id:           string;
  name:         string;
  category:     string;
  sub_category: string | null;
  image_url:    string | null;
  image_urls:   string[] | null;
  product_url:  string | null;
  rawPrice:     number;
  /** Prezzo finale con markup 1.2× (quello che il cliente paga) */
  dealPrice:    number;
  /** Prezzo di riferimento mercato 1.45× — usato per mostrare lo sconto */
  marketPrice:  number;
  /** Percentuale di risparmio arrotondata */
  discountPct:  number;
}

/**
 * Restituisce i prodotti Budget King ordinati per prezzo crescente.
 * dealPrice  = rawPrice × 1.20  (nostro markup standard)
 * marketPrice= rawPrice × 1.45  (prezzo medio di mercato di riferimento)
 * discountPct ≈ 17%  — visible saving rispetto al mercato
 */
export async function getTacticalDeals(limit = 8): Promise<TacticalDeal[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, sub_category, image_url, image_urls, product_url, price')
    .eq('is_budget_king', true)
    .eq('is_active', true)
    .order('price', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[getTacticalDeals] Supabase error:', error.message);
    return [];
  }

  const deals: TacticalDeal[] = [];
  for (const row of data ?? []) {
    const raw = parseFloat(String(row.price ?? ''));
    if (isNaN(raw) || raw <= 0) continue;
    // raw è già il prezzo finale (markup applicato in import)
    const dealPrice   = raw;
    const marketPrice = Math.round(raw * 1.20 * 100) / 100;
    const discountPct = Math.round((1 - dealPrice / marketPrice) * 100);
    deals.push({
      id:           String(row.id),
      name:         row.name         ?? '',
      category:     row.category     ?? '',
      sub_category: row.sub_category ?? null,
      image_url:    row.image_url    ?? null,
      image_urls:   Array.isArray(row.image_urls) ? row.image_urls : null,
      product_url:  row.product_url  ?? null,
      rawPrice:     raw,
      dealPrice,
      marketPrice,
      discountPct,
    });
  }
  return deals;
}

// ─── Fetch principale con paginazione ───────────────────────────────────────────
export interface FetchProductsResult {
  products: Product[];
  /** total available rows matching current filters, or null if not returned */
  total: number | null;
}

export async function fetchProducts({
  search = '',
  category = 'all',
  subCategory = '',
  page = 0,
}: {
  search?: string;
  category?: Category;
  subCategory?: string;
  page?: number;
}): Promise<FetchProductsResult> {

  // Paginazione sempre attiva — evita di caricare migliaia di righe in una volta
  const rangeFrom = page * PAGE_SIZE;
  const rangeTo   = (page + 1) * PAGE_SIZE - 1;

  let query = supabase
    .from('products')
    .select('id, name, category, sub_category, image_url, image_urls, product_url, price, rating, review_count, is_budget_king', { count: 'exact' })
    .eq('is_active', true)
    .range(rangeFrom, rangeTo);

  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  if (category !== 'all') {
    query = query.eq('category', category);
  }

  if (subCategory.trim()) {
    query = query.eq('sub_category', subCategory.trim());
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[fetchProducts] Errore Supabase:', error.message);
    throw error;
  }

  return { products: (data ?? []) as Product[], total: count };
}

/**
 * Ritorna un map sub_category → count prodotti visibili per una data categoria.
 * "Visibili" = is_active = true (stessa logica di fetchProducts).
 * Usato da SubCategoryFilter per nascondere sub-cat vuote.
 */
export async function fetchSubCategoryCounts(
  category: string,
): Promise<Record<string, number>> {
  if (!category || category === 'all') return {};

  const { data, error } = await supabase
    .from('products')
    .select('sub_category')
    .eq('category', category)
    .eq('is_active', true)
    .not('sub_category', 'is', null);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.sub_category) {
      counts[row.sub_category] = (counts[row.sub_category] ?? 0) + 1;
    }
  }
  return counts;
}
