import { supabase } from './supabase';
import { Product } from '@/types/product';

export type Category =
  | 'all'
  | 'hardware-crypto-wallets'
  | 'tactical-power-grid'
  | 'comms-security-shield'
  | 'survival-edc-tech'
  | 'trading-gaming-desk-accessories-premium'
  | 'sim-racing-accessories-premium'
  | 'sim-racing'
  | 'pc-hardware-high-ticket'
  | 'sicurezza-domotica-high-end'
  // categorie forzate da file override (corrispondono esattamente al DB)
  | 'Smart Security'
  | 'Tactical Power'
  | 'PC Hardware'
  // prodotti importati ma non ancora classificati
  | 'UNSORTED';

/** Value used by importer to mark uncategorized rows */
export const UNSORTED_CAT: Category = 'UNSORTED';

export const PAGE_SIZE = 12;

// ─── Mappa cross-selling: per ogni categoria "core", le categorie "accessori" suggerite ───
const COMPLEMENTARY_MAP: Record<string, string[]> = {
  'hardware-crypto-wallets':                   ['comms-security-shield', 'survival-edc-tech', 'tactical-power-grid'],
  'tactical-power-grid':                       ['survival-edc-tech', 'hardware-crypto-wallets'],
  'comms-security-shield':                     ['survival-edc-tech', 'hardware-crypto-wallets'],
  'survival-edc-tech':                         ['comms-security-shield', 'tactical-power-grid', 'hardware-crypto-wallets'],
  'trading-gaming-desk-accessories-premium':   ['sim-racing-accessories-premium', 'pc-hardware-high-ticket'],
  'sim-racing-accessories-premium':            ['trading-gaming-desk-accessories-premium', 'pc-hardware-high-ticket'],
  'sim-racing':                                ['sim-racing-accessories-premium', 'trading-gaming-desk-accessories-premium'],
  'pc-hardware-high-ticket':                   ['trading-gaming-desk-accessories-premium', 'sim-racing-accessories-premium'],
  'sicurezza-domotica-high-end':               ['hardware-crypto-wallets', 'comms-security-shield'],
  'Smart Security':                            ['hardware-crypto-wallets', 'comms-security-shield'],
  'Tactical Power':                            ['survival-edc-tech', 'hardware-crypto-wallets'],
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
    .select('id, name, category, description, image_url, image_urls, affiliate_url, price')
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

// ─── Fetch principale con paginazione ───────────────────────────────────────────
export interface FetchProductsResult {
  products: Product[];
  /** total available rows matching current filters, or null if not returned */
  total: number | null;
}

export async function fetchProducts({
  search = '',
  category = 'all',
  page = 0,
}: {
  search?: string;
  category?: Category;
  page?: number;
}): Promise<FetchProductsResult> {

  let query = supabase
    .from('products')
    .select('id, name, category, description, image_url, image_urls, affiliate_url, price', { count: 'exact' })
    .not('image_url', 'is', null)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  // Ricerca testuale sulla colonna 'name' (colonna reale nel DB)
  if (search.trim()) {
    query = query.ilike('name', `%${search.trim()}%`);
  }

  // Filtro categoria tramite la colonna 'category' del DB
  if (category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[fetchProducts] Errore Supabase:', error.message);
    throw error;
  }

  if (data && data.length > 0) {
    const cols = Object.keys(data[0]).join(', ');
    console.log(`[fetchProducts] pagina=${page} count=${data.length} colonne=[${cols}]`);
  }

  const filtered = ((data ?? []) as Product[]).filter((p) => hasValidImage(p.image_url));
  return { products: filtered, total: count };
}
