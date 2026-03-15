-- Migration: add sub_category column to products
-- Run this once in the Supabase SQL Editor before running assign-subcategories.ts
ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Optional: add an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_sub_category ON products (sub_category);
