---
name: IRON_REPAIR_V1 Catalog Rebuild
description: Tabula Rasa + Iron Repair protocol executed 2026-04-15 — catalog wiped and rebuilt, categories aligned to 4 canonical, GoldEdge renamed
type: project
---

Executed TABULA RASA + IRON_REPAIR_V1 on 2026-04-15.

**Why:** Full catalog reset requested. Old categories (Smart Home, Smart Security) were stale. GoldEdge branding was replaced with "Selezione di Punta". 4 canonical categories established.

**Changes made:**
- DB wipe script created at `scripts/tabula_rasa_db.sql` — TRUNCATE products (human must execute in Supabase)
- 120 products seeded via `scripts/seed_catalog.ts` (30 per category, validated: 0 duplicate ASINs, all have image_url)
- Categories canonical: FPV Drones, Sim Racing, Crypto Wallets, Cyber Security
- "Smart Security" / "Smart Home" removed from ALL code files (components, locales, API routes, lib/products.ts)
- "GoldEdge" renamed to "Selezione di Punta" in UI text; component filename `GoldEdgeSection.tsx` kept for import continuity
- Blog reset: 4 new posts (one per category) in `content/blog/`, `lib/blog/posts.ts` rewritten
- Stripe/checkout orphan references removed from bot route, admin API routes
- TypeScript build: 0 errors post-refactor

**2026-04-15 UPDATE — Cyber Security OPZIONE A reseed:**
- CYBER_SECURITY array replaced with 30 OPZIONE A products (all legal)
- 8 illegal items replaced: WiFi Jammer → GL.iNet Beryl AX, GSM Interceptor → GL.iNet Slate AX + RTL-SDR V4, Evil Twin Kit → Alfa AWUS036ACH, USB Killer → PortaPow Data Blocker, + 4 others
- New sub-categories added: pentest-hardware, sdr-rf, rfid-nfc, encrypted-storage, surveillance-legal
- New high-value SKUs: Flipper Zero (~€150 cost), HackRF One (~€290 cost), Proxmark3 RDV4 (~€180 cost) — improve category AOV
- Hak5 products (Rubber Ducky, Bash Bunny, WiFi Pineapple, LAN Turtle, OMG Cable) use official links (not Amazon IT) — no affiliate tag
- Flipper Zero uses flipper.net official link — not Amazon IT
- Librem Key uses puri.sm official link — not Amazon IT
- Blog post updated: "Top 30 Cyber Gadgets 2026" with all 30 product references
- Seed validated: 0 errors, 0 duplicate ASINs, all 120 products inserted successfully

**2026-04-15 UPDATE — Seed V2 final pass:**
- TRUNCATE added to `seed_catalog.ts` using `.delete().gte('id', 0)` — products.id is bigint, NOT UUID
- YubiKey ASIN corrections: 5 NFC → B08DHL1YDL, 5C NFC → B09WPGGCS1 (old script had them swapped/wrong)
- Seed re-executed: TRUNCATE OK, 120/120 inserted, 0 errors, 0 duplicate ASINs
- Blog: 4 posts confirmed in lib/blog/posts.ts (FPV/Sim/Crypto/Cyber), all ogImages point to live Amazon product images
- Branding: "GoldEdge" exists only in component filename (GoldEdgeSection.tsx), no user-facing text; rendered copy is "Selezione di Punta"
- "Smart Security" only in legacy scripts (not imported in app); frontend uses "Cyber Security" everywhere
- npm run build: exit code 0, zero TypeScript errors, 4 blog SSG routes confirmed

**How to apply:**
- When adding new categories: update `lib/products.ts` Category type, `components/CategoryFilter.tsx`, `components/FeaturedCategories.tsx`, `components/StructuredData.tsx`, all locale JSONs
- Seed script uses `calcPrice(cost)` helper = `round(cost * 1.20 + 3.99, 2)` — never apply markup twice
- Pentest/research products must include legal disclaimer in `description` field
- Products not on Amazon IT (Hak5, Flipper, Purism) use direct brand links without affiliate tag
