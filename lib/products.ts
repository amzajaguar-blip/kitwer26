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
  'comms-security-shield': [
    { id: 'privacy-screen',  label: 'Privacy Screen',  slug: 'privacy-screen' },
    { id: 'security-keys',   label: 'Security Keys',   slug: 'security-keys' },
    { id: 'rfid-protection', label: 'RFID / Faraday',  slug: 'rfid-protection' },
    { id: 'encrypted-comms', label: 'Encrypted Comms', slug: 'encrypted-comms' },
    { id: 'general',         label: 'General',         slug: 'general' },
  ],
  'survival-edc-tech': [
    { id: 'flashlights',     label: 'Flashlights',       slug: 'flashlights' },
    { id: 'multitools',      label: 'Multitools',        slug: 'multitools' },
    { id: 'water-filter',    label: 'Water Filter',      slug: 'water-filter' },
    { id: 'cordage-shelter', label: 'Cordage & Shelter', slug: 'cordage-shelter' },
    { id: 'medical-kit',     label: 'Medical Kit',       slug: 'medical-kit' },
    { id: 'navigation',      label: 'Navigation',        slug: 'navigation' },
    { id: 'general',         label: 'General',           slug: 'general' },
  ],
  'tactical-power-grid': [
    { id: 'power-stations', label: 'Power Stations', slug: 'power-stations' },
    { id: 'solar-panels',   label: 'Solar Panels',   slug: 'solar-panels' },
    { id: 'power-banks',    label: 'Power Banks',    slug: 'power-banks' },
    { id: 'batteries',      label: 'Batteries',      slug: 'batteries' },
    { id: 'general',        label: 'General',        slug: 'general' },
  ],
  'Tactical Power': [
    { id: 'power-stations', label: 'Power Stations', slug: 'power-stations' },
    { id: 'solar-panels',   label: 'Solar Panels',   slug: 'solar-panels' },
    { id: 'power-banks',    label: 'Power Banks',    slug: 'power-banks' },
    { id: 'batteries',      label: 'Batteries',      slug: 'batteries' },
    { id: 'general',        label: 'General',        slug: 'general' },
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
  subCategory = '',
  page = 0,
}: {
  search?: string;
  category?: Category;
  subCategory?: string;
  page?: number;
}): Promise<FetchProductsResult> {

  let query = supabase
    .from('products')
    .select('id, name, category, sub_category, description, image_url, image_urls, affiliate_url, price', { count: 'exact' })
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

  // Filtro sotto-categoria
  if (subCategory.trim()) {
    query = query.eq('sub_category', subCategory.trim());
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
