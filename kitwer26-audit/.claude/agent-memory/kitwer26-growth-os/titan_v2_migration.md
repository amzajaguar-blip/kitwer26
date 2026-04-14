---
name: TITAN v2.2 Migration
description: Schema migration adding is_active, amazon_price, updated_at columns to products table — executed 2026-04-08
type: project
---

TITAN v2.2 migration applied to production Supabase on 2026-04-08 via pg module (psql not available on this machine).

**Why:** The kitwer26-audit system required is_active and amazon_price columns. All product queries were failing with `column amazon_price does not exist`, breaking both the audit system and the production site.

**How to apply:** The products table now has is_active (boolean, auto-computed by trigger), amazon_price (numeric, nullable), and updated_at (timestamptz). The self-healing trigger `trg_products_sync_active` auto-syncs is_active on INSERT/UPDATE of price, affiliate_url, or image_url. Three filtered indices exist for active-product queries.

Post-migration counts: 6105 total, 4790 active (78.5%), 1315 inactive. Active coverage below 85% threshold — inactive products need investigation.

Migration method: `node -e` with `pg` module from kitwer26-audit/node_modules, connecting via DATABASE_URL (session pooler).
