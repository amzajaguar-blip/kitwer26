-- TITAN v2 Migration — Kitwer26
-- Run this in Supabase SQL Editor BEFORE executing titan-v2.ts
-- Safe to re-run (all statements are idempotent)

-- 1. Add is_active column (visibility gate — replaces price=0 hack)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Add amazon_price column (store base Amazon price for future repricing)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS amazon_price NUMERIC(10, 2);

-- 3. Initial population of is_active based on current data
--    TRUE  = has valid affiliate URL with tag + price > 0 + not placeholder image
--    FALSE = missing URL, placeholder URL, or price = 0
UPDATE products
SET is_active = CASE
  WHEN price IS NULL OR price <= 0                         THEN FALSE
  WHEN affiliate_url IS NULL OR affiliate_url = ''         THEN FALSE
  WHEN affiliate_url ILIKE '%INSERIRE%'                    THEN FALSE
  WHEN affiliate_url NOT LIKE '%tag=kitwer26-21%'          THEN FALSE
  WHEN image_url IS NULL OR image_url = ''                 THEN FALSE
  WHEN image_url ILIKE '%placeholder%'                     THEN FALSE
  ELSE TRUE
END;

-- 4. Index for fast visibility queries
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_active_category ON products (category, is_active) WHERE is_active = TRUE;

-- 5. Verify counts
SELECT
  COUNT(*) FILTER (WHERE is_active = TRUE)  AS active_products,
  COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_products,
  COUNT(*)                                  AS total_products
FROM products;
