# Memory Index -- kitwer26-growth-os

- [Stripe Order Insert Bug](project_stripe_order_bug.md) -- orders.product_id NOT NULL blocks all Stripe order creation (now moot — checkout fully disabled 2026-04-14)
- [Session 2026-04-14](session_2026_04_14.md) -- Affiliate Pivot Phase 1+2 complete: CTAs="Vedi Offerta", Stripe tombstoned, lib/affiliate.ts canonical, audit=4790/4795 OK, build clean
- [GoldEdge is_top_tier missing](project_goldedge_is_top_tier.md) -- GoldEdgeSection broken: is_top_tier column does not exist in DB, deploy blocked until migration applied
- [products.id is bigint](project_products_id_type.md) -- numeric not UUID; wrap with String() before .slice() in scripts
- [Catalog Activation Baseline](project_catalog_activation.md) -- 2026-04-15 expansion 8→28 active; validity gate + bucket sizes (crypto is bottleneck at 52)
