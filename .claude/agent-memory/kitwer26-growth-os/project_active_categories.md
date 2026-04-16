---
name: Active DB Categories — confirmed live 2026-04-16
description: All 4 canonical categories active in Supabase as of 2026-04-16 post-deploy sanity check: FPV Drones, Sim Racing, Crypto Wallets, Cyber Security — 120 products total
type: project
---

As of 2026-04-16 (post IRON_REPAIR_V1 + deploy), all 4 canonical categories are populated in DB:
- `FPV Drones` — 30 products (seeded 2026-04-15/16)
- `Sim Racing` — 30 products
- `Crypto Wallets` — 30 products
- `Cyber Security` — 30 products
TOTAL: 120 active products. Old categories (`fpv-drones-tech`, `3D Printing`) no longer exist in DB post-TRUNCATE.

**Why:** TABULA RASA + seed_catalog.ts (IRON_REPAIR_V1) wiped old data and rebuilt with 4 canonical category names matching frontend exactly.

**How to apply:** Blog ogImages can now reference real product image_urls from any of the 4 categories. Category filter, FeaturedCategories, and StructuredData all use these exact 4 string names. Legacy `fpv-drones-tech` slug still present in lib/products.ts Category type as safety valve — do not remove until confirmed zero DB rows with that slug.
