export interface ProductVariant {
  name:   string;
  values: string[];
  /** hiRes image URL per ogni valore, es. {"Rosso": "https://..."} */
  images?: Record<string, string>;
  /** Prezzo per valore, es. {"128GB": 99.99, "256GB": 149.99} */
  prices?: Record<string, number>;
  /** Product ID per valore — link diretto alla variante */
  productIds?: Record<string, string>;
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
  product_url?: string;
  price?: string | number;
  is_price_pending?: boolean;
  is_budget_king?: boolean;
  sub_category?: string;
  variants?: ProductVariant[];
  rating?: number;        // es. 4.5 (da Amazon o CSV)
  review_count?: number;  // es. 1248
  // Campi legacy / fallback
  title?: string;
  thumbnailImage?: string;
}
