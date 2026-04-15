---
name: products.id is numeric bigint, not UUID
description: The products table uses numeric bigint IDs, not UUID strings — scripts calling .slice() on id will crash
type: project
---

`products.id` in the Supabase schema is a numeric bigint, not a UUID string.

**Why:** Discovered 2026-04-15 when `scripts/nuke_and_fix.mjs` crashed with `s.id.slice is not a function` on line 188. The script assumed UUID string IDs and called `.slice(0, 8)` directly on `id`.

**How to apply:** In any script or code that formats/truncates a product id for display or logging, wrap with `String(p.id)` before calling string methods. When building `.in('id', ids)` Supabase filters, pass numeric ids directly (do not quote). Sample IDs observed: 6198, 10002, 18947, 12499 (all numeric).
