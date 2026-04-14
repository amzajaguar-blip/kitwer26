---
name: DB Cleanup 2026-04-08
description: Deleted 79 INSERIRE stub products (is_active=false, product_url ILIKE INSERIRE), leaving 6026 total / 4790 active
type: project
---

Hard clean executed 2026-04-08: removed 79 stub products that had placeholder URLs containing "INSERIRE" and is_active=false.

Post-cleanup: 6026 total products, 4790 active.

**Why:** Stub products pollute catalog health metrics and can surface in admin queries.
**How to apply:** Future imports should validate product_url before insertion. Monitor catalog health ratio (active/total should stay above 95%).
