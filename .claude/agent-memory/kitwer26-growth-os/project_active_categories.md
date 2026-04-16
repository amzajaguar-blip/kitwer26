---
name: Active DB Categories — 2026-04-15
description: Only fpv-drones-tech and 3D Printing have active products (price > 0) in Supabase as of 2026-04-15
type: project
---

As of 2026-04-15, querying Supabase for `price > 0` returns only two distinct categories:
- `fpv-drones-tech` — 414 products
- `3D Printing` — 586 products

The 4 canonical frontend categories (Crypto Wallets, Smart Security, Sim Racing, FPV Drones) are not yet populated in DB with these exact names. `fpv-drones-tech` is the DB slug for FPV Drones.

**Why:** This means blog posts tied to Crypto Wallets, Smart Security, or Sim Racing cannot have real ogImage URLs from DB — those posts were removed from ALL_POSTS per fallback rule.

**How to apply:** When adding new blog posts or assigning ogImages, always query DB first. Do not invent image URLs. If canonical category has no DB products, remove the post per the established fallback policy.
