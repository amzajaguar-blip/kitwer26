---
name: Post-Deploy Sanity Check — 2026-04-16
description: IRON_REPAIR_V1 deploy verified: 120 products active, 4 categories confirmed, affiliate tags clean, Cyber Security top 5 prices logged
type: project
---

Post-deploy sanity check completed 2026-04-16. All checks passed.

**Catalog state (confirmed live):**
- 120 products active in DB (all 4 categories, 30 each)
- Active count was 0 on first check — caused by is_active=false bug (see project_is_active_bug.md)
- Fix applied via direct UPDATE; all 120 now active

**4 canonical categories confirmed — no others:**
- FPV Drones
- Sim Racing
- Crypto Wallets
- Cyber Security
- Smart Home: NOT present (correctly absent)

**Cyber Security top 5 prices (as of 2026-04-16):**
- Flipper Zero: €147.99
- USB Rubber Ducky: €57.99
- Bash Bunny: €111.99
- WiFi Pineapple: €123.99
- LAN Turtle: €63.99

**Affiliate / integrity checks:**
- Affiliate tag: all 5 sampled products carry tag=kitwer26-21 (Amazon IT links only — Hak5/Flipper/Purism use direct brand links without tag, as expected)
- Anti-razor scan: 0 illegal/razor products found in live DB

**UI checks:**
- GoldEdgeSection component renders visible label "Selezione di Punta" — internal filename GoldEdgeSection.tsx unchanged (intentional for import continuity)

**Why:** Baseline observability record for the IRON_REPAIR_V1 launch state. Useful for regression detection in future deploys.

**How to apply:** Use these prices and counts as the baseline when comparing future catalog health checks. If active count drops below 114 (95% threshold) or affiliate tag is missing on Amazon IT links, flag immediately.
