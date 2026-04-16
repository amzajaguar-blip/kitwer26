# Memory Index -- kitwer26-growth-os

- [IRON_REPAIR_V1 Rebuild](project_iron_repair_v1.md) -- 2026-04-15 Tabula Rasa: 4 categories (FPV/Sim/Crypto/Cyber), 120-product seed, GoldEdge→Selezione di Punta, 4 blog posts
- [Stripe Order Insert Bug](project_stripe_order_bug.md) -- orders.product_id NOT NULL blocks all Stripe order creation (now moot — checkout fully disabled 2026-04-14)
- [GoldEdge is_top_tier missing](project_goldedge_is_top_tier.md) -- GoldEdgeSection broken: is_top_tier column does not exist in DB, deploy blocked until migration applied
- [products.id is bigint](project_products_id_type.md) -- numeric not UUID; wrap with String() before .slice() in scripts
