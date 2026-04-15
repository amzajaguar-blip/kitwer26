---
name: GoldEdge is_top_tier column missing
description: GoldEdgeSection queries is_top_tier column that does not exist in Supabase products table — section silently renders nothing on production
type: project
---

GoldEdgeSection.tsx queries `.eq('is_top_tier', true)` but the `products` table has no `is_top_tier` column. PostgREST returns HTTP 400 and the Supabase JS client sets `data = null`, so the component hits `products.length === 0` and returns `null` — completely invisible on production.

**Why:** GoldEdge was added in commit 89f5277 (2026-04-15) but the schema migration was not applied to Supabase. TypeScript did not catch it because `Product extends Record<string, any>`.

**How to apply:** Before deploying any GoldEdge-related feature, verify `is_top_tier` column exists in Supabase. Migration SQL needed:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_top_tier BOOLEAN DEFAULT FALSE;
```
After migration, mark desired products with `UPDATE products SET is_top_tier = true WHERE <criteria>`.
Do not deploy until the column exists AND `SELECT COUNT(*) FROM products WHERE is_top_tier = true AND is_active = true` returns > 0.
