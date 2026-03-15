export interface ProductVariant {
  name:   string;
  values: string[];
  /** hiRes image URL per ogni valore, es. {"Rosso": "https://..."} */
  images?: Record<string, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Product extends Record<string, any> {
  id?: string;
  // Colonne reali Supabase
  name: string;
  category?: string;
  description?: string;
  image_url?: string;
  image_urls?: string[];
  images?: string[];
  affiliate_url?: string;
  price?: string | number;
  is_price_pending?: boolean;
  sub_category?: string;
  variants?: ProductVariant[];
  // Campi legacy / fallback
  title?: string;
  thumbnailImage?: string;
}
