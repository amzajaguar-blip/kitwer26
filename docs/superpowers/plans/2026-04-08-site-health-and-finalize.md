# Site Health, Maintenance Skill & Branch Finalization

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify frontend design improvements render correctly, rewrite the maintenance skill to focus on the product catalog, run SEO health check, and close out the current development cycle with a clean deploy to Vercel production.

**Architecture:** Four sequential tasks — verify (read-only), skill rewrite (file edit), SEO check (read + patch), finalize (tsc + commit + deploy). No new components needed.

**Tech Stack:** Next.js 15 App Router, Supabase, Vercel CLI, `/home/locoomo/.claude/skills/kitwer-manutenzione.md`

---

## Files touched

| Action | Path |
|--------|------|
| Verify (read) | `components/blog/ArticleHero.tsx`, `components/BlogPreviewSection.tsx`, `components/blog/TrustBadge.tsx`, `components/blog/WinnerBar.tsx`, `app/blog/[slug]/BlogPageClient.tsx`, `app/page.tsx` / `components/HomepageClient.tsx` |
| Overwrite | `/home/locoomo/.claude/skills/kitwer-manutenzione.md` |
| Patch (if needed) | `app/sitemap.ts`, any article with missing `seoTitle`/`seoDescription` |
| Deploy | `vercel --prod` |

---

## Task 1 — Verify frontend design improvements

**Goal:** Confirm all design changes from the blog redesign sprint are actually wired up and rendering. Do not change code yet — read and flag issues only.

**Files:**
- Read: `components/HomepageClient.tsx`
- Read: `components/BlogPreviewSection.tsx`
- Read: `components/blog/ArticleHero.tsx`
- Read: `components/blog/TrustBadge.tsx`
- Read: `components/blog/WinnerBar.tsx`
- Read: `app/blog/[slug]/BlogPageClient.tsx`
- Read: `app/blog/page.tsx`

- [ ] **Step 1.1: Check BlogPreviewSection is mounted in homepage**

Read `components/HomepageClient.tsx`. Confirm:
```
import BlogPreviewSection from './BlogPreviewSection'
```
…and `<BlogPreviewSection />` appears after `<TacticalDealsSection />`.

Expected: both import and JSX present. If missing → add import + JSX between TacticalDeals and Footer.

- [ ] **Step 1.2: Check ArticleHero is used in BlogPageClient**

Read `app/blog/[slug]/BlogPageClient.tsx`. Confirm:
```tsx
import ArticleHero from '@/components/blog/ArticleHero';
// ...
<ArticleHero post={post} winnerLabel={...} />
```
Expected: import + usage present.

- [ ] **Step 1.3: Check TrustBadge is used in BlogProductCard**

Read `components/blog/BlogProductCard.tsx`. Confirm:
```tsx
import TrustBadge from './TrustBadge';
// ...
<TrustBadge variant={...} />
```
Expected: import + JSX present.

- [ ] **Step 1.4: Check WinnerBar (StickyWinnerBar) is mounted**

Read `app/blog/[slug]/BlogPageClient.tsx`. Confirm `StickyWinnerBar` is imported and rendered when `winnerData` is non-null.

- [ ] **Step 1.5: Check blog index has category filter**

Read `app/blog/page.tsx`. Confirm:
- `'use client'` directive present
- `useState` for `activeFilter`
- `AnimatePresence` wrapping card list
- Filter chips rendered above cards

- [ ] **Step 1.6: TypeScript clean check**

```bash
npx tsc --noEmit
```
Expected: no output (zero errors). If errors appear, fix before moving on.

---

## Task 2 — Rewrite kitwer-manutenzione skill (product-first)

**Goal:** Replace the current skill at `/home/locoomo/.claude/skills/kitwer-manutenzione.md` with a product-focused version. The site's core value is the product catalog — prices, images, affiliate links, categories. Blog is secondary. The new skill must make catalog health the *first* thing checked.

**Files:**
- Overwrite: `/home/locoomo/.claude/skills/kitwer-manutenzione.md`

- [ ] **Step 2.1: Read current skill to capture anything worth keeping**

Read `/home/locoomo/.claude/skills/kitwer-manutenzione.md`.
Identify sections to keep: pricing formula, category table, git checkpoint, deploy command.

- [ ] **Step 2.2: Write the new product-first skill**

Write `/home/locoomo/.claude/skills/kitwer-manutenzione.md` with the following structure:

```markdown
# Kitwer26 — Manutenzione Sito

Usa questa skill ogni volta che si fa manutenzione su Kitwer26.com.
**PRIORITÀ: catalogo prodotti > blog > tutto il resto.**

---

## 0. TypeScript check (sempre primo)
\`\`\`bash
npx tsc --noEmit
\`\`\`
Zero errori prima di qualsiasi altra operazione.

---

## 1. Salute Catalogo Prodotti (CRITICO)

### 1a. Prodotti nascosti (price = 0)
\`\`\`sql
-- Supabase SQL Editor
SELECT id, name, category FROM products WHERE price = 0 ORDER BY name;
\`\`\`
Ogni riga è un prodotto invisibile nel frontend. Rieseguire import con `--upsert` per aggiornare il prezzo.

### 1b. Immagini rotte
\`\`\`sql
SELECT id, name, image_url FROM products
WHERE image_url IS NULL
   OR image_url = '/placeholder.svg'
   OR image_url LIKE '%placeholder%'
ORDER BY name;
\`\`\`
Per correggere: aggiorna `image_url` manualmente o riesegui import con le immagini corrette.

### 1c. Affiliate URL mancanti o senza tag
\`\`\`sql
SELECT id, name, affiliate_url FROM products
WHERE affiliate_url IS NULL
   OR affiliate_url NOT LIKE '%tag=kitwer26-21%'
ORDER BY name;
\`\`\`
Tutti i link Amazon devono terminare con `?tag=kitwer26-21` o `&tag=kitwer26-21`.

### 1d. Categoria non valida
\`\`\`sql
SELECT DISTINCT category FROM products ORDER BY category;
\`\`\`
Confronta con la tabella categorie valide (sezione 5 qui sotto).

---

## 2. Import Prodotti

### Da CSV
CSV in `MAGAZZINO/`. Formato colonne richiesto:
`Prodotto,Marca,Prezzo,URL,Categoria,Sottocategoria`

\`\`\`bash
# Dry-run prima — non scrive nulla
npx tsx scripts/unified-importer.ts --dry-run --no-asin

# Scrivi (upsert se prodotto esiste già per slug)
npx tsx scripts/unified-importer.ts --no-asin --upsert
\`\`\`

**Regole pricing (già applicate dall'importer):**
\`\`\`
price_finale = round_commercial(prezzo_base_eur × 1.20 + 3.99)
\`\`\`
I prezzi nel DB sono già finali. **Non ri-applicare il markup.**

### Bundle / prodotti speciali
\`\`\`bash
npx tsx scripts/seed-bundles.ts          # dry-run
npx tsx scripts/seed-bundles.ts --write  # scrive
\`\`\`

---

## 3. Check Categorie & SubCategorie

Quando aggiungi prodotti in una nuova categoria, verifica che `lib/products.ts` abbia:
- La categoria nella lista `CATEGORIES`
- Le sottocategorie corrispondenti in `SUBCATEGORIES`

Se manca → aggiungila prima di fare import, altrimenti il filtro frontend non la mostra.

---

## 4. Check Ordini & Checkout

### Stato ordini recenti
\`\`\`sql
SELECT id, status, total_amount, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 20;
\`\`\`

### Link Amazon negli ordini
Ogni riga in `order_items` deve avere `amazon_url` compilato.
\`\`\`sql
SELECT oi.id, p.name, oi.amazon_url
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.amazon_url IS NULL
LIMIT 20;
\`\`\`

---

## 5. Categorie valide (DB + frontend)

| Slug DB | Label UI |
|---------|----------|
| `hardware-crypto-wallets` | Crypto Wallets |
| `sim-racing-accessories-premium` | Sim Racing |
| `fpv-drones-tech` | FPV & Droni |
| `Smart Security` | Smart Security |
| `survival-edc-tech` | Survival EDC |
| `tactical-power-grid` | Power Grid |
| `Smart Home` | Smart Home |
| `3D Printing` | 3D Printing |
| `trading-gaming-desk-accessories-premium` | Gaming Desk |
| `PC Hardware` | PC Hardware |

---

## 6. SEO check (prodotti)

Per ogni nuovo prodotto verificare che `ProductCard` mostri:
- `name` non troncato (< 80 chars)
- `price > 0` (altrimenti non appare)
- `image_url` non placeholder
- `affiliate_url` presente

Per le pagine prodotto `/product/[slug]`:
- Title tag = `{name} | Kitwer26`
- Structured data `Product` schema presente (da `StructuredData.tsx`)

---

## 7. SEO check (blog) — secondario

Per ogni nuovo articolo:
- `seoTitle` ≤ 60 chars
- `seoDescription` 150–160 chars
- `products[].namePattern` matcha un prodotto nel DB (ilike contains)
- `winnerProductId` è un ID valido in `products[]`
- Articolo presente in `lib/blog/posts.ts` → `ALL_POSTS`

---

## 8. Git checkpoint

\`\`\`bash
git add <file specifici — mai git add -A>
git status          # verifica cosa stai committando
git commit -m "tipo: descrizione breve"
git push origin main
\`\`\`

---

## 9. Deploy

\`\`\`bash
vercel --prod
\`\`\`
Oppure il push su `main` triggera auto-deploy se CI è configurato.
Verifica deploy: `vercel ls` o dashboard Vercel.

---

## Pattern comuni di bug (prodotti)

| Sintomo | Causa | Fix |
|---------|-------|-----|
| Prodotto non appare nel frontend | `price = 0` | Riesegui import con `--upsert` e prezzo corretto |
| Immagine rotta nel ProductCard | `image_url` null o placeholder | Aggiorna manualmente in Supabase o reimporta |
| Link Amazon 404 | `affiliate_url` senza `?tag=kitwer26-21` | Aggiorna la colonna in Supabase |
| Categoria non filtrabile | Slug non in `CATEGORIES` di `lib/products.ts` | Aggiungi categoria alla lista |
| Blog product card vuota | `namePattern` non matcha DB (ilike) | Controlla la query in Supabase direttamente |
| Ordine senza link Amazon | `order_items.amazon_url` null | Fix in `manage-links` o aggiorna manualmente |
```

- [ ] **Step 2.3: Verify the file was written correctly**

Read back `/home/locoomo/.claude/skills/kitwer-manutenzione.md` and confirm:
- Section 1 (Catalogo Prodotti) appears before section 4 (Blog check)
- SQL queries for price=0, broken images, missing affiliate tags are all present
- Category table is present and complete

---

## Task 3 — SEO check

**Goal:** Run a targeted SEO check on the product pages and blog articles. Patch any critical issues found.

**Files:**
- Read: `app/sitemap.ts`
- Read: `app/layout.tsx`
- Read: `app/product/[slug]/page.tsx` (if it exists)
- Read: `components/StructuredData.tsx`
- Read: each `content/blog/*.ts` for seoTitle length

- [ ] **Step 3.1: Verify sitemap includes all content types**

Read `app/sitemap.ts`. Confirm:
1. Static pages (home, blog, about, etc.) are listed
2. Dynamic product pages are included via DB query
3. Blog articles are included via `getAllPosts()`
4. `SITE_UPDATED` date is `2026-04-08` or later

If blog articles missing → already fixed in previous session (commit `5248d03`). Verify only.

- [ ] **Step 3.2: Check seoTitle length for all blog articles**

```bash
grep -r "seoTitle:" content/blog/ | sed "s/.*seoTitle: '//;s/'.*//" | awk '{print length, $0}' | sort -rn
```
Expected: all lines show ≤ 60 chars. If any > 60 → shorten in the relevant content file.

- [ ] **Step 3.3: Check seoDescription length**

```bash
grep -r "seoDescription:" content/blog/ | sed "s/.*seoDescription: '//;s/'.*//" | awk '{print length, $0}' | sort -rn
```
Expected: all lines between 150–160 chars. Flag any < 140 or > 165.

- [ ] **Step 3.4: Verify robots.ts**

Read `app/robots.ts`. Confirm:
```ts
rules: { userAgent: '*', allow: '/' }
sitemap: 'https://kitwer26.com/sitemap.xml'
```
If missing sitemap line → add it.

- [ ] **Step 3.5: Check og:image path exists**

```bash
ls -la /home/locoomo/Scrivania/kitwer26/public/og-image.png 2>/dev/null || echo "MISSING"
```
If MISSING → the OG image needs to be created (1200×630px). Flag to user but don't block deploy.

- [ ] **Step 3.6: Commit any SEO patches**

```bash
git add app/sitemap.ts app/robots.ts content/blog/
git status
git commit -m "fix: SEO patches from health check 2026-04-08"
git push origin main
```
Only commit if there were actual changes.

---

## Task 4 — Finish development branch

**Goal:** Final type check, ensure all changes committed, deploy to Vercel production.

**Files:**
- Run: `npx tsc --noEmit`
- Run: `git status`
- Run: `vercel --prod`

- [ ] **Step 4.1: Final TypeScript clean**

```bash
npx tsc --noEmit
```
Expected: no output. If errors → fix before deploying.

- [ ] **Step 4.2: Check nothing is uncommitted**

```bash
git status
git diff --stat
```
Expected: clean working tree. If dirty → review changes, commit with appropriate message.

- [ ] **Step 4.3: Verify remote is up to date**

```bash
git log --oneline origin/main..HEAD
```
Expected: no output (local = remote). If commits ahead → `git push origin main`.

- [ ] **Step 4.4: Deploy to Vercel production**

```bash
vercel --prod
```
Expected output: `✅ Production: https://kitwer26.com [XX]`

If token not set:
```bash
export VERCEL_TOKEN=$(cat ~/.vercel/token 2>/dev/null || echo "TOKEN_MISSING")
vercel --prod --token=$VERCEL_TOKEN
```

- [ ] **Step 4.5: Smoke test production URLs**

After deploy, verify these URLs return HTTP 200:
```bash
curl -s -o /dev/null -w "%{http_code}" https://kitwer26.com/
curl -s -o /dev/null -w "%{http_code}" https://kitwer26.com/blog
curl -s -o /dev/null -w "%{http_code}" https://kitwer26.com/blog/guida-self-custody-bitcoin-2026
curl -s -o /dev/null -w "%{http_code}" https://kitwer26.com/sitemap.xml
```
Expected: all `200`.

- [ ] **Step 4.6: Update memory with session summary**

Save to `/home/locoomo/.claude/projects/-home-locoomo-Scrivania-kitwer26/memory/session_2026_04_08.md`:
```markdown
---
name: Session 2026-04-08
description: Blog pillar article self-custody, refactors, maintenance skill rewrite, SEO check, production deploy
type: project
---

Completato in questa sessione:
- Articolo pillar "Guida Self-Custody Bitcoin 2026" (11 prodotti, 6 FAQ)
- Refactor: formatEur() condiviso, React.memo su SimpleMarkdown, winnerData rimosso da buildJsonLd
- Skill manutenzione riscritta product-first (Sezione 1 = catalogo, SQL per price=0/immagini rotte/affiliate missing)
- SEO health check eseguito
- Deploy production Vercel ✅

**Why:** Chiudere il ciclo blog sprint e garantire sito in buono stato.
**How to apply:** Nuova sessione può partire da sitemap + catalogo senza rileggere storia.
```

---

## Self-review

**Spec coverage:**
- ✅ frontend-design verify → Task 1
- ✅ skill-creator product-first → Task 2
- ✅ seo-check → Task 3
- ✅ finishing-a-development-branch → Task 4

**Placeholder scan:** No TBD/TODO present. All SQL queries complete. All bash commands include expected output.

**Type consistency:** No new types introduced.
