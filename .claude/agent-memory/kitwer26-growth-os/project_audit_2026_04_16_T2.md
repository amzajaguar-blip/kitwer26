---
name: Integrated Audit Session 2026-04-16-T2
description: Full codebase + conversion risk audit — 8 findings logged, 3 conversion blockers, 1 silent SEO bug, 2 cosmetic/low risks
type: project
---

Audit session 2026-04-16-T2. Scope: all modified files in working tree + key components + locale system + blog pipeline.

**FINDING 1 — CRITICAL CONVERSION BLOCKER: GoldEdgeSection silently renders nothing**
- `GoldEdgeSection.tsx` queries `.eq('is_top_tier', true)` — column does not exist in Supabase `products` table.
- PostgREST returns HTTP 400, component gets `data=null`, returns `null` (invisible to user).
- The "Selezione di Punta" premium section — highest AOV touchpoint — is dead on production.
- Fix: apply `ALTER TABLE products ADD COLUMN IF NOT EXISTS is_top_tier BOOLEAN DEFAULT FALSE;` in Supabase, then UPDATE target products. HIGH RISK — requires human sign-off.
- Status as of audit: UNRESOLVED. Migration noted in project_goldedge_is_top_tier.md since 2026-04-15.

**FINDING 2 — CRITICAL CONVERSION BLOCKER: CategoryFilter uses missing i18n key `categories.cyberSecurity`**
- `CategoryFilter.tsx` line 76: `label: t('categories.cyberSecurity')` — key does NOT exist in any locale file (en, it, de, fr, es).
- All locale files have `categories.security` (not `cyberSecurity`) and `categories.cryptoWallets`, `categories.simRacing` — but NOT `cyberSecurity`.
- Result: the "Cyber Security" category label falls back to the raw key string `"categories.cyberSecurity"` on all locales.
- This makes the category label visually broken for all non-IT users who see the key string instead of the label.
- Fix (LOW RISK): add `"cyberSecurity": "Cyber Security"` to the `categories` object in all 5 locale files.

**FINDING 3 — MODERATE CONVERSION RISK: `og-image.png` missing from public/**
- `app/layout.tsx` declares `images: [{ url: '/og-image.png', ...}]` for OG/Twitter cards.
- `/public/og-image.png` does NOT exist (only `icon.png`, `LOGOKITWER.png` in public/).
- All social shares of the homepage will show a broken/missing card image.
- Blog posts have per-post `ogImage` (Amazon CDN URLs) as fallback — they are OK.
- Fix (LOW RISK): create or upload a 1200x630 og-image.png to `/public/`, or update metadata to use `/icon.png` as fallback.

**FINDING 4 — LOW RISK: Locale files contain stale legacy keys (smartHome, smartSecurity, printing3d)**
- All 5 locale files carry `categories.smartHome` and `categories.printing3d`; it/de/fr/es also have `categories.smartSecurity`, `categories.tacticalDrones` (in two namespaces).
- None of these are rendered in any active component — CategoryFilter uses `cyberSecurity`, `cryptoWallets`, `simRacing`, `security`.
- No user-facing impact. Cosmetic debt.

**FINDING 5 — LOW RISK: CategoryFilter icon map references removed categories**
- `CategoryFilter.tsx` lines 11/17: `ICONS.smartSecurity` and `ICONS.smartHome` still mapped.
- Not rendered in active category list. Dead code — no runtime impact.

**FINDING 6 — INFORMATIONAL: `is_active` reset bug unresolved**
- Supabase trigger hypothesis not yet confirmed or eliminated.
- Every future bulk import risks producing zero-active-products silently.
- Mitigation: manual UPDATE pass remains required after each seed/import until trigger is investigated.

**FINDING 7 — INFORMATIONAL: Blog registry is clean**
- `lib/blog/posts.ts` correctly imports only 4 canonical posts (fpv-drone-guida-2026, sim-racing-setup-2026, hardware-wallet-confronto-2026, cyber-security-toolkit-2026).
- All 4 have valid `ogImage` (Amazon CDN URLs). No broken image fallback chain needed.
- Legacy posts (dji-mini-2026, fpv-creator-2026, etc.) exist as files but are NOT imported into ALL_POSTS — correctly suppressed.

**FINDING 8 — INFORMATIONAL: Admin dashboard references `orders` table (orders flow)**
- `app/api/admin/dashboard-stats/route.ts` and `orders-pending/route.ts` query `orders` table.
- Checkout is disabled as of 2026-04-14 — zero orders expected. No conversion impact.
- Margin calc in orders-pending hardcoded at 20% (line: `const margin = revenue * 0.20`) — acceptable as heuristic but should be config-driven eventually.

**Priority action list:**
1. [HIGH] Apply `is_top_tier` migration to Supabase — human sign-off required — unblocks "Selezione di Punta" section
2. [LOW] Add `categories.cyberSecurity` key to all 5 locale files — fixes broken category label
3. [LOW] Create `/public/og-image.png` — fixes broken homepage social card

**Why:** Audit requested as part of ongoing DB audit + code fixes session. Baseline for regression detection.

**How to apply:** Use this as the T2 checkpoint. Any future audit should diff against these 8 findings.
