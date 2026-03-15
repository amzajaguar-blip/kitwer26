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

/** Sub-categorie disponibili per ogni macro-categoria */
export const SUB_CATEGORIES: Record<string, { id: string; label: string }[]> = {
  'hardware-crypto-wallets': [
    { id: 'entry-level',  label: 'Entry Level' },
    { id: 'premium',      label: 'Premium' },
    { id: 'air-gapped',   label: 'Air-Gapped' },
    { id: 'backup-seed',  label: 'Backup Seed' },
  ],
  'comms-security-shield': [
    { id: 'privacy-screen',   label: 'Privacy Screen' },
    { id: 'security-keys',    label: 'Security Keys' },
    { id: 'rfid-protection',  label: 'RFID / Faraday' },
    { id: 'encrypted-comms',  label: 'Encrypted Comms' },
  ],
  'survival-edc-tech': [
    { id: 'flashlights',      label: 'Flashlights' },
    { id: 'multitools',       label: 'Multitools' },
    { id: 'water-filter',     label: 'Water Filter' },
    { id: 'cordage-shelter',  label: 'Cordage & Shelter' },
    { id: 'medical-kit',      label: 'Medical Kit' },
    { id: 'navigation',       label: 'Navigation' },
  ],
  'tactical-power-grid': [
    { id: 'power-stations', label: 'Power Stations' },
    { id: 'solar-panels',   label: 'Solar Panels' },
    { id: 'power-banks',    label: 'Power Banks' },
    { id: 'batteries',      label: 'Batteries' },
  ],
  'Tactical Power': [
    { id: 'power-stations', label: 'Power Stations' },
    { id: 'solar-panels',   label: 'Solar Panels' },
    { id: 'power-banks',    label: 'Power Banks' },
    { id: 'batteries',      label: 'Batteries' },
  ],
  'sim-racing-accessories-premium': [
    { id: 'steering-wheels', label: 'Steering Wheels' },
    { id: 'pedals',          label: 'Pedals' },
    { id: 'shifters',        label: 'Shifters' },
    { id: 'cockpit-rigs',    label: 'Cockpits & Rigs' },
    { id: 'handbrakes',      label: 'Handbrakes' },
  ],
  'sim-racing': [
    { id: 'steering-wheels', label: 'Steering Wheels' },
    { id: 'pedals',          label: 'Pedals' },
    { id: 'shifters',        label: 'Shifters' },
    { id: 'cockpit-rigs',    label: 'Cockpits & Rigs' },
    { id: 'handbrakes',      label: 'Handbrakes' },
  ],
  'trading-gaming-desk-accessories-premium': [
    { id: 'monitor-arms',     label: 'Monitor Arms' },
    { id: 'gaming-chairs',    label: 'Gaming Chairs' },
    { id: 'desk-accessories', label: 'Desk Accessories' },
    { id: 'cooling-pads',     label: 'Cooling Pads' },
    { id: 'vr-headsets',      label: 'VR / Headsets' },
  ],
  'pc-hardware-high-ticket': [
    { id: 'gpus',        label: 'GPUs' },
    { id: 'cpus',        label: 'CPUs' },
    { id: 'memory',      label: 'Memory / RAM' },
    { id: 'storage',     label: 'Storage' },
    { id: 'cpu-cooling', label: 'CPU Cooling' },
  ],
  'PC Hardware': [
    { id: 'gpus',        label: 'GPUs' },
    { id: 'cpus',        label: 'CPUs' },
    { id: 'memory',      label: 'Memory / RAM' },
    { id: 'storage',     label: 'Storage' },
    { id: 'cpu-cooling', label: 'CPU Cooling' },
  ],
  'sicurezza-domotica-high-end': [
    { id: 'smart-cameras',   label: 'Smart Cameras' },
    { id: 'smart-locks',     label: 'Smart Locks' },
    { id: 'alarm-systems',   label: 'Alarm Systems' },
    { id: 'home-automation', label: 'Home Automation' },
  ],
  'Smart Security': [
    { id: 'smart-cameras',   label: 'Smart Cameras' },
    { id: 'smart-locks',     label: 'Smart Locks' },
    { id: 'alarm-systems',   label: 'Alarm Systems' },
    { id: 'home-automation', label: 'Home Automation' },
  ],
};

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
