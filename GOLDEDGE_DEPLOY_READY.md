# GOLDEDGE DEPLOY READY

**Date:** 2026-04-15  
**Commit:** ff227cd

---

## Deleted Dead Code

| File | Reason |
|------|--------|
| `app/checkout/page.tsx` | Redirect tombstone |
| `app/checkout/success/page.tsx` | Redirect tombstone |
| `app/checkout/error/page.tsx` | Redirect tombstone |
| `app/api/checkout/stripe/route.ts` | 410 Gone stub |
| `app/api/webhooks/stripe/route.ts` | 410 Gone stub |
| `lib/stripe.ts` | Empty export tombstone |
| `scripts/stripe-seed-products.ts` | process.exit(1) stub |
| `app/api/orders/route.ts` | 410 Gone stub |
| `lib/bundles.ts` | Bundle query engine |
| `components/BundleSection.tsx` | Bundle carousel UI |
| `app/bundle/[id]/BundlePageClient.tsx` | Bundle landing page |
| `app/bundle/[id]/page.tsx` | SSG bundle pages |
| `app/api/bundles/route.ts` | Bundles JSON endpoint |
| `components/CartDrawer.tsx` | Affiliate list drawer |
| `context/CartContext.tsx` | Cart state management |

---

## New / Modified Files

| File | Change |
|------|--------|
| `components/GoldEdgeSection.tsx` | NEW — fetches is_top_tier=true products, amber CTA |
| `components/HomepageClient.tsx` | GoldEdgeSection replaces BundleSection, CartDrawer removed |
| `app/layout.tsx` | CartProvider removed |
| `components/ProductPageClient.tsx` | Above-fold CTA hero before carousel |
| `components/TacticalDealsSection.tsx` | Clicks route via /track/product/[id] |
| `app/sitemap.ts` | Bundle pages removed from sitemap |
| `app/api/admin/revalidate/route.ts` | Bundle IDs + bundle revalidation removed |
| `package.json` | stripe package removed |
| `.env.local` | Stripe keys removed |

---

## Zero Dead Imports Verified

```
grep CartContext|CartDrawer|BundleSection|lib/bundles|lib/stripe|from.*stripe → 0 results
grep /checkout links in active code → 0 results
tsc --noEmit → 0 errors
```

---

## Affiliate Flow — 100% Clean

- Every CTA routes through `/track/product/[id]` (click analytics + 302 redirect)
- Redirect builds affiliate URL via `buildAffiliateLink()` → `tag=kitwer26-21`
- No internal checkout, no Stripe, no cart processing
- CartDrawer, CartContext, CartProvider: deleted
- All `/checkout/*` and `/bundle/*` routes: deleted

---

## Homepage Order (Post-GoldEdge)

1. HeroSection
2. TrustBar
3. **GoldEdgeSection** ← NEW (is_top_tier products, amber UI)
4. FeaturedCategories
5. TacticalDealsSection
6. BlogPreviewSection
7. ProductGrid (infinite scroll)

---

## Product Page — Above Fold

CTA hero block renders **before** the image carousel:
- Product name + price visible immediately
- Large orange "VEDI OFFERTA SU AMAZON" button (h-14, full-width)
- No scrolling required on mobile or desktop to see the CTA

---

## Supabase Prerequisite

GoldEdgeSection renders only if:
```sql
SELECT COUNT(*) FROM products WHERE is_top_tier = true AND is_active = true;
-- Must return > 0
```
