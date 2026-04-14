---
name: Stripe Checkout Order Insert Bug
description: orders table requires product_id (UUID, NOT NULL) but Stripe checkout API does not send it — all order inserts fail silently
type: project
---

The `orders` table has a NOT NULL constraint on `product_id` (UUID type). The Stripe checkout API (`app/api/checkout/stripe/route.ts`) does NOT include `product_id` in the order insert — it only saves products in `order_items`. This causes every order creation to fail with error code 23502 (not-null violation).

**Why:** The `product_id` column is a legacy from the Mollie single-product checkout flow. The Stripe multi-item flow uses `order_items` instead. The schema was never migrated.

**How to apply:** Before Stripe checkout can work end-to-end, run `ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL;` in Supabase SQL Editor. This is a HIGH RISK change (schema modification) requiring human sign-off. The checkout API code itself is correct — only the DB constraint needs fixing.

Additional finding: product IDs are now integers (e.g., 22993) but `orders.product_id` is UUID type — a type mismatch that would also prevent linking even if NOT NULL were dropped.

Discovered: 2026-04-13
