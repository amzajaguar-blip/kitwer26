---
name: Catalog Activation Baseline
description: Catalog validity gate and bucket distribution observed during the 2026-04-15 expansion from 8 to 28 active products
type: project
---

Catalog expansion 2026-04-15: activated 20 products bringing active count from 8 to 28. `is_top_tier` was deliberately left false on the new 20 (only original 8 stay top-tier).

Validity triple-gate used (reusable for future activations):
1. `image_url IS NOT NULL`
2. `product_url ILIKE %amazon%` or `%amzn%`
3. `price BETWEEN 15 AND 2000`

Plus category regex on `name || category || sub_category` for crypto / fpv / sim / smart, plus exclusion regex for shaver/beauty/fashion noise left over from legacy imports.

Observed pool sizes after gate (inactive products, 2026-04-15):
- total valid candidates: 1732
- crypto bucket: 52 (smallest -- bottleneck for balanced expansion)
- fpv: 473
- sim: 412
- smart: 795

Why: blog-mentioned products (ledger/trezor/geprc/radiomaster/dji mini/insta360/moza/ultraloq/hiseeu) should be prioritized so the blog internal links land on active product pages -- conversion lift from coherent blog-to-PDP funnels.

How to apply: when asked to expand the catalog again, reuse `scripts/activate-20-products.mjs` as the template but note the crypto bucket is thin -- don't set rigid per-category quotas above ~5 for crypto or selection will fail.
