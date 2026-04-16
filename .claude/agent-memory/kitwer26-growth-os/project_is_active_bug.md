---
name: is_active Column Reset Bug
description: seed_catalog.ts sets is_active=true but DB showed false after insert — fixed via direct UPDATE; possible DB trigger suspected
type: project
---

**Bug observed 2026-04-16 (post-deploy sanity check):**
After IRON_REPAIR_V1 seed (120 products inserted with is_active=true in seed script), the live DB showed all 120 products as is_active=false.

**Fix applied:** Direct SQL UPDATE to set is_active=true on all rows. All 120 products became active immediately.

**Root cause: unconfirmed, under investigation.**
Leading hypothesis: a Supabase DB trigger is resetting is_active to false on INSERT (e.g., a "pending review" trigger or a default override). The seed script logic is correct — the bug is in the DB layer, not the application code.

**Why this matters:** If the trigger exists, every future seed, import, or product INSERT will silently deactivate all new products. The platform would appear to have zero inventory without an explicit UPDATE pass after each import.

**Recommended investigation steps:**
1. In Supabase dashboard → Database → Triggers: check for any trigger on the `products` table that fires on INSERT
2. Check `products` table column defaults: confirm `is_active` default is `true`, not `false`
3. Run a test insert with is_active=true and immediately SELECT to verify the value persisted
4. If a trigger is found resetting the column: evaluate whether to DROP it or add `is_active=true` to the trigger's WHEN condition

**How to apply:** After any future bulk import or seed operation, always run a quick COUNT(*) WHERE is_active=true to verify activation persisted before declaring catalog live. If count is 0, apply the UPDATE workaround and escalate trigger investigation.

**Status:** Bug mitigated (UPDATE applied), root cause not yet confirmed. Trigger investigation is MEDIUM RISK (schema-level read-only investigation) — no sign-off needed to investigate, but any trigger DROP or schema change requires human sign-off.
