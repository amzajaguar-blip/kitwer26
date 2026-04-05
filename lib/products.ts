import { supabase } from './supabase';
import { Product } from '@/types/product';

export type Category =
  | 'all'
  | 'hardware-crypto-wallets'
  | 'survival-edc-tech'
  | 'trading-gaming-desk-accessories-premium'
  | 'sim-racing-accessories-premium'
  | 'sim-racing'
  | 'pc-hardware-high-ticket'
  | 'sicurezza-domotica-high-end'
  // categorie forzate da file override (corrispondono esattamente al DB)
  | 'Smart Security'
  | 'PC Hardware'
  | 'Smart Home'
  | '3D Printing'
  | 'tactical-drones-fpv'
  // prodotti importati ma non ancora classificati
  | 'UNSORTED'
  // alias navigabili — alias lato UI per le categorie elite bundle
  | 'comms-security-shield';

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
  'hardware-crypto-wallets': [
    { id: 'entry-level', label: 'Entry Level', slug: 'entry-level' },
    { id: 'premium',     label: 'Premium',     slug: 'premium' },
    { id: 'air-gapped',  label: 'Air-Gapped',  slug: 'air-gapped' },
    { id: 'backup-seed', label: 'Backup Seed', slug: 'backup-seed' },
    { id: 'general',     label: 'General',     slug: 'general' },
  ],
  'survival-edc-tech': [
    { id: 'multitools',      label: 'Multitools',        slug: 'multitools' },
    { id: 'water-filter',    label: 'Water Filter',      slug: 'water-filter' },
    { id: 'cordage-shelter', label: 'Cordage & Shelter', slug: 'cordage-shelter' },
    { id: 'medical-kit',     label: 'Medical Kit',       slug: 'medical-kit' },
    { id: 'navigation',      label: 'Navigation',        slug: 'navigation' },
    { id: 'general',         label: 'General',           slug: 'general' },
  ],
  'sim-racing-accessories-premium': [
    { id: 'steering-wheels', label: 'Steering Wheels',  slug: 'steering-wheels' },
    { id: 'pedals',          label: 'Pedals',           slug: 'pedals' },
    { id: 'shifters',        label: 'Shifters',         slug: 'shifters' },
    { id: 'cockpit-rigs',    label: 'Cockpits & Rigs',  slug: 'cockpit-rigs' },
    { id: 'handbrakes',      label: 'Handbrakes',       slug: 'handbrakes' },
    { id: 'general',         label: 'General',          slug: 'general' },
  ],
  'sim-racing': [
    { id: 'steering-wheels', label: 'Steering Wheels',  slug: 'steering-wheels' },
    { id: 'pedals',          label: 'Pedals',           slug: 'pedals' },
    { id: 'shifters',        label: 'Shifters',         slug: 'shifters' },
    { id: 'cockpit-rigs',    label: 'Cockpits & Rigs',  slug: 'cockpit-rigs' },
    { id: 'handbrakes',      label: 'Handbrakes',       slug: 'handbrakes' },
    { id: 'general',         label: 'General',          slug: 'general' },
  ],
  'trading-gaming-desk-accessories-premium': [
    { id: 'monitor-arms',     label: 'Monitor Arms',    slug: 'monitor-arms' },
    { id: 'gaming-chairs',    label: 'Gaming Chairs',   slug: 'gaming-chairs' },
    { id: 'desk-accessories', label: 'Desk Accessories',slug: 'desk-accessories' },
    { id: 'cooling-pads',     label: 'Cooling Pads',    slug: 'cooling-pads' },
    { id: 'vr-headsets',      label: 'VR / Headsets',   slug: 'vr-headsets' },
    { id: 'general',          label: 'General',         slug: 'general' },
  ],
  'pc-hardware-high-ticket': [
    { id: 'gpus',        label: 'GPUs',        slug: 'gpus' },
    { id: 'cpus',        label: 'CPUs',        slug: 'cpus' },
    { id: 'memory',      label: 'Memory / RAM',slug: 'memory' },
    { id: 'storage',     label: 'Storage',     slug: 'storage' },
    { id: 'cpu-cooling', label: 'CPU Cooling', slug: 'cpu-cooling' },
    { id: 'general',     label: 'General',     slug: 'general' },
  ],
  'PC Hardware': [
    { id: 'gpus',        label: 'GPUs',        slug: 'gpus' },
    { id: 'cpus',        label: 'CPUs',        slug: 'cpus' },
    { id: 'memory',      label: 'Memory / RAM',slug: 'memory' },
    { id: 'storage',     label: 'Storage',     slug: 'storage' },
    { id: 'cpu-cooling', label: 'CPU Cooling', slug: 'cpu-cooling' },
    { id: 'general',     label: 'General',     slug: 'general' },
  ],
  'sicurezza-domotica-high-end': [
    { id: 'smart-cameras',   label: 'Smart Cameras',   slug: 'smart-cameras' },
    { id: 'smart-locks',     label: 'Smart Locks',     slug: 'smart-locks' },
    { id: 'alarm-systems',   label: 'Alarm Systems',   slug: 'alarm-systems' },
    { id: 'home-automation', label: 'Home Automation', slug: 'home-automation' },
    { id: 'general',         label: 'General',         slug: 'general' },
  ],
  'Smart Security': [
    { id: 'smart-cameras',   label: 'Smart Cameras',   slug: 'smart-cameras' },
    { id: 'smart-locks',     label: 'Smart Locks',     slug: 'smart-locks' },
    { id: 'alarm-systems',   label: 'Alarm Systems',   slug: 'alarm-systems' },
    { id: 'home-automation', label: 'Home Automation', slug: 'home-automation' },
    { id: 'general',         label: 'General',         slug: 'general' },
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
  'hardware-crypto-wallets':                   ['survival-edc-tech'],
  'comms-security-shield':                     ['survival-edc-tech', 'hardware-crypto-wallets'],
  'survival-edc-tech':                         ['hardware-crypto-wallets'],
  'trading-gaming-desk-accessories-premium':   ['sim-racing-accessories-premium', 'pc-hardware-high-ticket'],
  'sim-racing-accessories-premium':            ['trading-gaming-desk-accessories-premium', 'pc-hardware-high-ticket'],
  'sim-racing':                                ['sim-racing-accessories-premium', 'trading-gaming-desk-accessories-premium'],
  'pc-hardware-high-ticket':                   ['trading-gaming-desk-accessories-premium', 'sim-racing-accessories-premium'],
  'sicurezza-domotica-high-end':               ['hardware-crypto-wallets', 'comms-security-shield'],
  'Smart Security':                            ['hardware-crypto-wallets', 'comms-security-shield'],
  'PC Hardware':                               ['trading-gaming-desk-accessories-premium', 'sim-racing-accessories-premium'],
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
    .not('price', 'is', null)
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
    .select('id, name, category, sub_category, description, image_url, image_urls, product_url, price', { count: 'exact' })
    // Filtra a livello DB — esclude prodotti senza immagine o prezzo valido
    .not('image_url', 'is', null)
    .neq('image_url', '')
    .neq('image_url', '/placeholder.svg')
    // Esclude ASIN usato come image ID (pattern: /images/I/B[9chars].)
    .not('image_url', 'like', '%/I/B_________._')
    .not('price', 'is', null)
    .gt('price', 0)
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
