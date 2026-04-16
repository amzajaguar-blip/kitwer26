-- ============================================================
-- TABULA RASA — Database Wipe
-- Execute in Supabase SQL Editor (Dashboard > SQL Editor)
-- WARNING: This deletes ALL products. Run with confirmation.
-- ============================================================

-- 1. Wipe product catalog
TRUNCATE TABLE products RESTART IDENTITY CASCADE;

-- 2. Remove Smart Security / Smart Home category references
-- (products table is already wiped; this handles any leftover category config tables)
-- If you have a separate "categories" table, run:
-- DELETE FROM categories WHERE name IN ('Smart Home', 'Smart Security');

-- 3. Confirm only 4 valid categories remain in seed data
-- (enforced by seed_catalog.ts — no DB category table required)

-- Verification query (run after seed):
-- SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY category;
