---
name: Tracking Communication System
description: Order tracking webhook + email notification system implemented 2026-04-08
type: project
---

Implemented full tracking communication system (2026-04-08):
- DB: order_tracking + order_tracking_events tables
- Webhook: POST /api/webhooks/tracking (Bearer auth via TRACKING_WEBHOOK_SECRET)
- Email: react-email templates in emails/tracking-update.tsx (5 status variants)
- Cross-sell: top 2 products by price injected into every email
- Cron: /api/cron/tracking-audit checks stale shipments every 12h
- Queue worker: scripts/process-tracking-emails.ts (run via cron or manually)

**Why:** Reduces post-purchase anxiety, lowers support tickets, enables cross-sell at high-attention moment (delivery).
**How to apply:** When user asks about order status flows, email notifications, or post-purchase UX — this system is already in place.
