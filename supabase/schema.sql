-- ============================================================
-- Kitwer26 - Gaming Hardware & Streaming Gear
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- DROP EXISTING (safe reset) ----------
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS kit_items CASCADE;
DROP TABLE IF EXISTS kits CASCADE;
DROP TABLE IF EXISTS product_cache CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;

-- ---------- PRODUCTS ----------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  price_current NUMERIC(10,2) NOT NULL,
  price_original NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT NOT NULL,
  is_direct_sell BOOLEAN NOT NULL DEFAULT false,
  is_bundle BOOLEAN NOT NULL DEFAULT false,
  bundle_items JSONB NOT NULL DEFAULT '[]',
  specs JSONB NOT NULL DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_specs ON products USING GIN(specs);

-- ---------- PRODUCT CACHE ("Redis dei Poveri") ----------
CREATE TABLE product_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  external_api_response JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cache_product ON product_cache(product_id);
CREATE INDEX idx_cache_updated ON product_cache(updated_at);

-- ---------- KITS ----------
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  price_current NUMERIC(10,2) NOT NULL,
  price_original NUMERIC(10,2),
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kits_slug ON kits(slug);

-- ---------- KIT ITEMS ----------
CREATE TABLE kit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_kit_items_kit ON kit_items(kit_id);
CREATE INDEX idx_kit_items_product ON kit_items(product_id);

-- ---------- ORDERS ----------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'open'
    CHECK (payment_status IN ('open', 'paid', 'failed')),
  mollie_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_status ON orders(payment_status);
CREATE INDEX idx_orders_mollie ON orders(mollie_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- ---------- AUTO-UPDATE updated_at ----------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cache_updated_at
  BEFORE UPDATE ON product_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER kits_updated_at
  BEFORE UPDATE ON kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------- RLS (Row Level Security) ----------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for products (needed for ISR/SSG)
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT USING (true);

-- Service role can do everything (for seed scripts and cache updates)
CREATE POLICY "Service role full access products"
  ON products FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access cache"
  ON product_cache FOR ALL USING (auth.role() = 'service_role');

-- Cache readable by anon for smart-cache reads on the edge
CREATE POLICY "Cache is viewable by everyone"
  ON product_cache FOR SELECT USING (true);

-- Kits: public read, service_role full access
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kits are viewable by everyone"
  ON kits FOR SELECT USING (true);

CREATE POLICY "Kit items are viewable by everyone"
  ON kit_items FOR SELECT USING (true);

CREATE POLICY "Service role full access kits"
  ON kits FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access kit_items"
  ON kit_items FOR ALL USING (auth.role() = 'service_role');

-- Orders: only service role (no public access)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access orders"
  ON orders FOR ALL USING (auth.role() = 'service_role');

-- ---------- ANALYTICS ----------
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click_buy')),
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analytics_event ON analytics(event_type, created_at DESC);

ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analytics insert by anon"
  ON analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "Analytics read by service"
  ON analytics FOR SELECT USING (auth.role() = 'service_role');

-- ---------- STORAGE ----------
-- Run in Supabase dashboard: Storage → New Bucket → "product-images" (public)
-- Or via Supabase CLI: supabase storage create product-images --public
