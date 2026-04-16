# Memory Index -- kitwer26-growth-os

- [IRON_REPAIR_V1 Rebuild](project_iron_repair_v1.md) -- 2026-04-15 Tabula Rasa: 4 categories (FPV/Sim/Crypto/Cyber), 120-product seed, GoldEdge→Selezione di Punta, 4 blog posts
- [Post-Deploy Sanity Check 2026-04-16](project_deploy_sanity_2026_04_16.md) -- 120 active confirmed, 4 categories clean, Cyber Security top 5 prices, affiliate tag=kitwer26-21 verified
- [is_active Column Reset Bug](project_is_active_bug.md) -- seed sets is_active=true but DB shows false after INSERT; possible trigger resetting column; fix: direct UPDATE; investigate triggers before next import
- [Active DB Categories](project_active_categories.md) -- 4 canonical categories live (120 products) as of 2026-04-16; old fpv-drones-tech/3D Printing gone post-TRUNCATE
- [Stripe Order Insert Bug](project_stripe_order_bug.md) -- orders.product_id NOT NULL blocks all Stripe order creation (now moot — checkout fully disabled 2026-04-14)
- [Audit Session 2026-04-16-T2](project_audit_2026_04_16_T2.md) -- 8 findings: 2 critical blockers (is_top_tier, cyberSecurity i18n), 1 missing og-image, 2 dead-code items
- [GoldEdge is_top_tier missing](project_goldedge_is_top_tier.md) -- GoldEdgeSection broken: is_top_tier column does not exist in DB, deploy blocked until migration applied
- [products.id is bigint](project_products_id_type.md) -- numeric not UUID; wrap with String() before .slice() in scripts
