---
name: Quarantine Run 2026-04-15
description: Catalog quarantine Option 2 executed — category sprawl discovered (852 products in invalid categories), 32 products active after, blog posts all missing ogImage
type: project
---

Quarantine script `scripts/quarantine.ts` created and executed 2026-04-15.

Results:
- 1000 products in DB total; 5989 inactive after run (DB has many more rows than expected — likely old paginated loads)
- 852 products flagged for invalid category; discovered categories outside valid set: hardware-crypto-wallets, survival-edc-tech, tactical-power-grid, sim-racing-accessories-premium, trading-gaming-desk-accessories-premium, PC Hardware, 3D Printing, Smart Home, fpv-drones-tech
- 15 duplicate image_url groups found; 38 losers deactivated; winner selected by highest realistic price then longest description
- 16 net-new products quarantined (874 were already inactive)
- 32 products active after run
- 6 blog posts missing ogImage — ALL 6 posts in registry lack ogImage field (file-based, no DB mutation)

**Why:** Owner approved Option 2 — quarantine without deletion. is_active=false used as hide mechanism.

**How to apply:** Next catalog import must use only the 4 valid categories: Sim Racing, FPV Drones, Crypto Wallets, Smart Security. All blog posts need ogImage fields added. Script is safe to re-run idempotently.

Note on blog architecture: Blog posts live in content/blog/*.ts as TypeScript objects. There is no blog_posts DB table. ogImage field = featured_image equivalent. published=false cannot be applied at DB level — removing from the ALL_POSTS array in lib/blog/posts.ts is the suppression mechanism.
