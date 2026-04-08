# Kitwer26 Developer Rules

## Communication Style
Act first, explain briefly after. Do not give lengthy theoretical explanations (e.g., WCAG standards, security best practices) unless explicitly asked. Fix the code directly.

## Conventions
This is a TypeScript/Next.js e-commerce project (KITWER26). Always use hardcoded display strings for user-facing text, never raw translation keys. When adding category names or labels visible to customers, use human-readable strings.

## Development Workflow
After making changes, always verify the correct project path and that changes are reflected in the running app. Do not claim changes are done without confirming the file was saved to the right location.

Before making any changes:
1. Run `pwd` and `ls` to confirm we're in the correct project directory
2. Check which dev server is running and on what port
3. List the files you plan to modify. Then proceed with the fix.

## Data Import
When importing CSV products: handle duplicate slugs by appending incrementing suffixes, parse European decimal format (comma as decimal separator), and apply the Kitwer pricing formula. Never assume US number formatting.

- European decimals: `12,50` → `12.50`
- Slug dedup: append `-2`, `-3`, etc. for duplicates
- Pricing formula: `cost * 1.35` markup, round to psychological price (e.g. €29.99)
- Map categories using hardcoded display names (never translation keys)
- Verify product count matches CSV rows after import

## Deployment
Git is not available in the Vercel sandbox environment. Do not attempt git commits or pushes when working in sandbox mode. For deployment, guide the user through manual Vercel dashboard steps if needed.

Vercel CLI path: `/home/locoomo/.local/bin/vercel`

## Technical Context
- Framework: Next.js (App Router), Prisma ORM, Tailwind CSS
- Database: PostgreSQL (Supabase)
- Import Logic: Always use `scripts/kitwer-tools.ts`
- Entry Point: `scripts/kitwer-tools.ts` per ogni operazione sui dati

## Product Rules (The "Budget King" Skill)
- **Quality Filter:** Never import products with rating < 4.2.
- **Budget King:** Every product < 25€ with rating >= 4.5 must be flagged as `is_budget_king: true`.
- **URL Purity:** Strip all Amazon affiliate tags and trackers from URLs; keep only the clean product link. Troncare dopo l'ASIN (es. `https://www.amazon.it/dp/B0XXXX/`).
- **Categorization:** Always use the `Sottocategoria` column from CSVs to build the navigation hierarchy.

## Strategic Bundle Engine (Dynamic Upsell)
I bundle NON sono statici. Devono pescare dal DB i prodotti con Rank migliore per:
1. **Cold Storage Fortress:** Premium Wallet + Backup Seed + Faraday.
2. **Blackout Immunity:** Power Station + Solar Panel + Flashlight.
3. **Ghost Operator:** Security Key + Privacy Screen + Encrypted Comms.
4. **Apex Command Center:** Cockpit + Wheel + Shifter.
- **Dynamic Pricing:** Sommare i prezzi dei componenti in tempo reale con formato `~€XXX,XX`.

## UI/UX Style Guide
- **Tone:** Cyberpunk, Tactical, Industrial.
- **Formatting:** Prezzi in grassetto, bordi netti, icone tecniche.
- **Fail-safe:** Se una query bundle fallisce, usare un prodotto 'Bestseller' della categoria madre come fallback.

## Interaction Workflow
- Agisci come Architetto (visione), Muratore (codice pulito) e Revisionatore (test).
- Se rilevi dati "sporchi" (nomi troppo lunghi, titoli con 'Premium' o 'Pro' inutili), puliscili automaticamente durante l'import.
- Do not ask for confirmation on URL cleaning; it is a mandatory default.
- Prima di ogni refactor importante: commit checkpoint con messaggio `checkpoint before refactor`.
