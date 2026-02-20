// ============================================================
// Kitwer26 - Gaming Hardware & Streaming Gear
// Database Schema Types
// ============================================================

export type ProductCategory =
  | 'Mouse'
  | 'Tastiera'
  | 'Monitor'
  | 'Monitor 144hz'
  | 'Cuffie'
  | 'Microfono'
  | 'Webcam'
  | 'Stream Deck'
  | 'GPU'
  | 'Sedia Gaming'
  | 'Mousepad'
  | 'Controller'
  | 'Cattura Video'
  | 'Illuminazione'
  | 'Accessori'
  | 'SSD'
  | 'RAM'
  | 'Audio Interface'
  | 'Ring Light'
  | 'Braccio Microfono'
  | 'Mixer Audio'
  | 'Fotocamera'

export interface ProductSpecs {
  [key: string]: string | number | boolean
}

// ---------- BUNDLE ITEMS ----------
export interface BundleItem {
  product_id: string
  title: string
  quantity: number
  price: number
}

// ---------- PRODUCTS ----------
export interface Product {
  id: string
  title: string
  slug: string
  description: string
  image_url: string
  price_current: number
  price_original: number | null
  currency: string
  category: string
  is_direct_sell: boolean
  is_bundle: boolean
  bundle_items: BundleItem[]
  specs: ProductSpecs
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export type ProductInsert =
  Omit<Product, 'id' | 'created_at' | 'updated_at' | 'is_direct_sell' | 'is_bundle' | 'bundle_items'> & {
    is_direct_sell?: boolean
    is_bundle?: boolean
    bundle_items?: BundleItem[]
  }
export type ProductUpdate = Partial<ProductInsert>

// ---------- PRODUCT CACHE ("Redis dei Poveri") ----------
export interface ProductCache {
  id: string
  product_id: string
  external_api_response: Record<string, unknown>
  source: string
  updated_at: string
}

export type ProductCacheInsert = Omit<ProductCache, 'id'>

// ---------- ORDERS ----------
export type OrderStatus = 'open' | 'paid' | 'failed'

export interface Order {
  id: string
  product_id: string
  customer_name: string
  customer_email: string
  shipping_address: string
  total_amount: number
  payment_status: OrderStatus
  mollie_id: string | null
  created_at: string
}

export type OrderInsert = Omit<Order, 'id' | 'created_at'>

// ---------- KITS ----------
export interface Kit {
  id: string
  title: string
  slug: string
  description: string
  image_url: string
  price_current: number
  price_original: number | null
  meta_title: string | null
  meta_description: string | null
  created_at: string
  updated_at: string
}

export type KitInsert = Omit<Kit, 'id' | 'created_at' | 'updated_at'>

// ---------- KIT ITEMS ----------
export interface KitItem {
  id: string
  kit_id: string
  product_id: string
  quantity: number
}

export type KitItemInsert = Omit<KitItem, 'id'>
