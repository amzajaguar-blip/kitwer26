-- ============================================================
-- Migration 001: Analytics table + Storage bucket
-- Run in Supabase SQL Editor
-- ============================================================

-- ---------- ANALYTICS ----------
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click_buy')),
  product_slug TEXT NOT NULL,
  product_title TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event_type, created_at DESC);

ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Analytics insert by anon"
  ON analytics FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Analytics read by service"
  ON analytics FOR SELECT USING (auth.role() = 'service_role');

-- ---------- STORAGE BUCKET ----------
-- The bucket "product-images" must be created via Supabase Dashboard or CLI.
-- Dashboard: Storage → New Bucket → name: "product-images" → toggle Public ON
-- CLI: supabase storage create product-images --public
--
-- After creating the bucket, add this storage policy via Dashboard → Storage → product-images → Policies:
-- Allow authenticated and service role to upload:
--   INSERT: (bucket_id = 'product-images')
-- Allow public read:
--   SELECT: (bucket_id = 'product-images')
