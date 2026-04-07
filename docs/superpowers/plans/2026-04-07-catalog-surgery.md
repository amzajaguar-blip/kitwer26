# Catalog Surgery v7.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pulizia chirurgica del DB prodotti (anomalie di contesto, duplicati, sub-categorie vuote) + fix frontend (zoom immagini offerte, "All" a fine filtro sub-cat, nasconde sub-cat vuote).

**Architecture:** Script Node.js standalone `catalog-surgery.ts` per le operazioni DB pericolose (con dry-run); miglioramenti alle keyword map in `assign-subcategories.ts`; aggiunta comando `fill-gallery` in `kitwer-tools.ts`; tre fix frontend mirati a `SubCategoryFilter.tsx`, `TacticalDealsSection.tsx` e `lib/products.ts`.

**Tech Stack:** TypeScript/tsx, Supabase JS client (service-role), Next.js 15 App Router, Tailwind CSS.

---

## File Map

| File | Azione | Scopo |
|------|--------|-------|
| `scripts/catalog-surgery.ts` | CREATE | Pulizia DB: anomalie, Faraday, power-grid general, survival is_active=false |
| `scripts/assign-subcategories.ts` | MODIFY | Aggiunge keyword per sub-cat vuote (PowerStation, FDM, Curtain Motors, Shifters, Desk, Premium) |
| `scripts/kitwer-tools.ts` | MODIFY | Aggiunge comando `fill-gallery` + migliora dedup (include product_url) |
| `kitwer-tools.sh` | MODIFY | Aggiunge `fill-gallery` al menu help |
| `lib/products.ts` | MODIFY | Aggiunge `fetchSubCategoryCounts()` |
| `components/SubCategoryFilter.tsx` | MODIFY | Sposta "All" a fine lista + nasconde sub-cat vuote |
| `components/TacticalDealsSection.tsx` | MODIFY | Aggiunge lightbox zoom su click immagine |

---

## Task 1: Script catalog-surgery.ts — operazioni di pulizia DB

**Files:**
- Create: `scripts/catalog-surgery.ts`

- [ ] **Step 1: Crea lo script con la struttura base e dry-run flag**

```typescript
#!/usr/bin/env tsx
/**
 * catalog-surgery.ts — Pulizia chirurgica DB prodotti Kitwer26
 *
 * Operazioni:
 *  1. Eradica anomalie di contesto (monopattino in FPV, smartwatch in 3D, drone in Crypto)
 *  2. Fix Faraday: sposta prodotti Faraday-bag da crypto-wallets → Smart Security
 *  3. Elimina sub_category "general" da tactical-power-grid (→ null)
 *  4. Disattiva tutti i prodotti survival-edc-tech (is_active = false)
 *
 * Run: npx tsx scripts/catalog-surgery.ts [--dry-run] [--step=1,2,3,4]
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k) process.env[k] = v;
    }
  } catch { /* usa variabili di sistema */ }
}
loadEnv();

const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', cyan: '\x1b[36m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', gray: '\x1b[90m', magenta: '\x1b[35m',
};
const log = (color: string, tag: string, msg: string) =>
  console.log(`${C.gray}${new Date().toLocaleTimeString('it-IT')}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);

const DRY_RUN = process.argv.includes('--dry-run');
const stepArg = process.argv.find(a => a.startsWith('--step='));
const STEPS   = stepArg ? stepArg.replace('--step=', '').split(',').map(Number) : [1, 2, 3, 4];

interface SurgeryStats {
  anomaliesDeleted: number;
  faradayMoved:     number;
  generalNulled:    number;
  survivalDeactivated: number;
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(`${C.red}${C.bright}[FATAL]${C.reset} Env vars mancanti`);
    process.exit(1);
  }
  return createClient(url, key);
}
```

- [ ] **Step 2: Implementa Step 1 — Eradica anomalie di contesto**

Aggiungi dopo la funzione `getSupabase()`:

```typescript
// ── STEP 1: Eradica anomalie di contesto ──────────────────────────────────────
async function step1_contextAnomalies(sb: SupabaseClient, stats: SurgeryStats) {
  log(C.cyan, 'STEP-1', 'Eradicazione anomalie di contesto...');

  // 1a. "monopattino" in fpv-drones-tech → frames
  const { data: scooters, error: e1 } = await sb
    .from('products')
    .select('id, name')
    .eq('category', 'fpv-drones-tech')
    .eq('sub_category', 'frames')
    .ilike('name', '%monopattino%');
  if (e1) { log(C.red, 'ERR', e1.message); }
  else {
    log(C.yellow, 'ANOMALY', `Trovati ${scooters?.length ?? 0} "monopattino" in FPV→Frames`);
    for (const p of scooters ?? []) log(C.gray, 'DEL', `  → ${p.id} | ${p.name}`);
    if (!DRY_RUN && (scooters?.length ?? 0) > 0) {
      const ids = scooters!.map(p => p.id);
      await sb.from('products').delete().in('id', ids);
      stats.anomaliesDeleted += ids.length;
    }
  }

  // 1b. "smartwatch" in 3D Printing
  const { data: watches, error: e2 } = await sb
    .from('products')
    .select('id, name')
    .eq('category', '3D Printing')
    .ilike('name', '%smartwatch%');
  if (e2) { log(C.red, 'ERR', e2.message); }
  else {
    log(C.yellow, 'ANOMALY', `Trovati ${watches?.length ?? 0} "smartwatch" in 3D Printing`);
    for (const p of watches ?? []) log(C.gray, 'DEL', `  → ${p.id} | ${p.name}`);
    if (!DRY_RUN && (watches?.length ?? 0) > 0) {
      const ids = watches!.map(p => p.id);
      await sb.from('products').delete().in('id', ids);
      stats.anomaliesDeleted += ids.length;
    }
  }

  // 1c. "drone" in hardware-crypto-wallets → air-gapped
  const { data: drones, error: e3 } = await sb
    .from('products')
    .select('id, name')
    .eq('category', 'hardware-crypto-wallets')
    .eq('sub_category', 'air-gapped')
    .ilike('name', '%drone%');
  if (e3) { log(C.red, 'ERR', e3.message); }
  else {
    log(C.yellow, 'ANOMALY', `Trovati ${drones?.length ?? 0} "drone" in Crypto→Air-Gapped`);
    for (const p of drones ?? []) log(C.gray, 'DEL', `  → ${p.id} | ${p.name}`);
    if (!DRY_RUN && (drones?.length ?? 0) > 0) {
      const ids = drones!.map(p => p.id);
      await sb.from('products').delete().in('id', ids);
      stats.anomaliesDeleted += ids.length;
    }
  }

  log(C.green, 'STEP-1', `Anomalie rimosse: ${DRY_RUN ? '[DRY-RUN]' : stats.anomaliesDeleted}`);
}
```

- [ ] **Step 3: Implementa Step 2 — Fix Faraday (sposta prodotti mal categorizzati)**

```typescript
// ── STEP 2: Fix Faraday — sposta da crypto-wallets → Smart Security ──────────
async function step2_faradayFix(sb: SupabaseClient, stats: SurgeryStats) {
  log(C.cyan, 'STEP-2', 'Fix prodotti Faraday mal categorizzati...');

  // Faraday bag/cage in crypto-wallets → appartengono a Smart Security (rfid-protection)
  const { data: faraday, error } = await sb
    .from('products')
    .select('id, name, sub_category')
    .eq('category', 'hardware-crypto-wallets')
    .or('name.ilike.%faraday%,description.ilike.%faraday bag%,description.ilike.%signal block%');
  if (error) { log(C.red, 'ERR', error.message); return; }

  log(C.yellow, 'FARADAY', `Trovati ${faraday?.length ?? 0} prodotti Faraday in Crypto Wallets`);
  for (const p of faraday ?? []) log(C.gray, 'MOVE', `  → ${p.id} | ${p.name} [${p.sub_category}]`);

  if (!DRY_RUN && (faraday?.length ?? 0) > 0) {
    const ids = faraday!.map(p => p.id);
    const { error: upErr } = await sb
      .from('products')
      .update({ category: 'Smart Security', sub_category: 'rfid-protection' })
      .in('id', ids);
    if (upErr) log(C.red, 'ERR', upErr.message);
    else stats.faradayMoved += ids.length;
  }

  log(C.green, 'STEP-2', `Faraday spostati: ${DRY_RUN ? '[DRY-RUN]' : stats.faradayMoved}`);
}
```

- [ ] **Step 4: Implementa Step 3 — Elimina "general" da tactical-power-grid**

```typescript
// ── STEP 3: Elimina sub_category "general" da tactical-power-grid ─────────────
async function step3_powerGridGeneral(sb: SupabaseClient, stats: SurgeryStats) {
  log(C.cyan, 'STEP-3', 'Rimozione sub_category "general" da tactical-power-grid...');

  const { data: generals, error } = await sb
    .from('products')
    .select('id, name')
    .eq('category', 'tactical-power-grid')
    .eq('sub_category', 'general');
  if (error) { log(C.red, 'ERR', error.message); return; }

  log(C.yellow, 'GENERAL', `Trovati ${generals?.length ?? 0} prodotti "general" in Power Grid`);

  if (!DRY_RUN && (generals?.length ?? 0) > 0) {
    const ids = generals!.map(p => p.id);
    const { error: upErr } = await sb
      .from('products')
      .update({ sub_category: null })
      .in('id', ids);
    if (upErr) log(C.red, 'ERR', upErr.message);
    else stats.generalNulled += ids.length;
  }

  log(C.green, 'STEP-3', `General nullati: ${DRY_RUN ? '[DRY-RUN]' : stats.generalNulled}`);
}
```

- [ ] **Step 5: Implementa Step 4 — Disattiva survival-edc-tech**

```typescript
// ── STEP 4: Disattiva tutti survival-edc-tech (is_active = false) ────────────
async function step4_survivalDeactivate(sb: SupabaseClient, stats: SurgeryStats) {
  log(C.cyan, 'STEP-4', 'Disattivazione prodotti survival-edc-tech...');

  const { count, error: cntErr } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'survival-edc-tech')
    .eq('is_active', true);
  if (cntErr) { log(C.red, 'ERR', cntErr.message); return; }

  log(C.yellow, 'SURVIVAL', `Prodotti attivi da disattivare: ${count ?? 0}`);

  if (!DRY_RUN) {
    const { error: upErr } = await sb
      .from('products')
      .update({ is_active: false })
      .eq('category', 'survival-edc-tech');
    if (upErr) log(C.red, 'ERR', upErr.message);
    else stats.survivalDeactivated = count ?? 0;
  }

  log(C.green, 'STEP-4', `Disattivati: ${DRY_RUN ? '[DRY-RUN]' : stats.survivalDeactivated}`);
}
```

- [ ] **Step 6: Aggiungi main() e report finale**

```typescript
// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log();
  console.log(`${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bright}${C.cyan}  CATALOG SURGERY v7.0${C.reset}${DRY_RUN ? `  ${C.yellow}[DRY-RUN — nessuna scrittura]${C.reset}` : ''}`);
  console.log(`${C.bright}${C.cyan}${'═'.repeat(60)}${C.reset}\n`);

  const sb    = getSupabase();
  const stats: SurgeryStats = { anomaliesDeleted: 0, faradayMoved: 0, generalNulled: 0, survivalDeactivated: 0 };

  if (STEPS.includes(1)) await step1_contextAnomalies(sb, stats);
  if (STEPS.includes(2)) await step2_faradayFix(sb, stats);
  if (STEPS.includes(3)) await step3_powerGridGeneral(sb, stats);
  if (STEPS.includes(4)) await step4_survivalDeactivate(sb, stats);

  console.log();
  console.log(`${C.bright}${C.green}${'─'.repeat(60)}${C.reset}`);
  console.log(`${C.bright}${C.green}  REPORT FINALE${C.reset}`);
  console.log(`${C.bright}${C.green}${'─'.repeat(60)}${C.reset}`);
  console.log(`  Anomalie eliminate:       ${C.red}${C.bright}${stats.anomaliesDeleted}${C.reset}`);
  console.log(`  Faraday spostati:         ${C.yellow}${C.bright}${stats.faradayMoved}${C.reset}`);
  console.log(`  General → null:           ${C.yellow}${C.bright}${stats.generalNulled}${C.reset}`);
  console.log(`  Survival disattivati:     ${C.yellow}${C.bright}${stats.survivalDeactivated}${C.reset}`);
  console.log(`${C.bright}${C.green}${'─'.repeat(60)}${C.reset}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 7: Esegui dry-run per verificare**

```bash
cd /home/locoomo/Scrivania/kitwer26
npx tsx scripts/catalog-surgery.ts --dry-run
```

Expected: output con conteggi di prodotti trovati per ogni step, nessuna modifica al DB.

- [ ] **Step 8: Commit script**

```bash
git add scripts/catalog-surgery.ts
git commit -m "feat: aggiungi catalog-surgery.ts — pulizia chirurgica DB"
```

---

## Task 2: Miglioramento keyword mapping sub-categorie

**Files:**
- Modify: `scripts/assign-subcategories.ts` (linee 63–160 — sezione SUB_KW)

- [ ] **Step 1: Aggiungi/espandi keyword per sub-cat vuote in assign-subcategories.ts**

Nella sezione `SUB_KW` di `scripts/assign-subcategories.ts`, espandi le entry esistenti:

**In `'tactical-power-grid'`** — aggiungi prima delle entry esistenti:

```typescript
['power-stations',  ['power station', 'jackery', 'ecoflow', 'bluetti', 'goal zero', 'powerstation',
                     'portable generator', 'station explorer', 'river max', 'delta pro',
                     'generatore portatile', 'centrale elettrica', 'power box', 'solar generator']],
```

**In `'3D Printing'`** — aggiungi block `fdm-printers` (prima di eventuali rule esistenti):

```typescript
'3D Printing': [
  ['fdm-printers',    ['prusa', 'bambu lab', 'creality', 'voron', 'fdm printer', 'cartesian printer',
                       'corexy', 'ender 3', 'ender-3', 'bambulab', 'p1s', 'x1 carbon', 'k1',
                       'ratrig', 'sovol', 'anycubic kobra', 'stampante 3d']],
  ['hotends-nozzles', ['hotend', 'nozzle', 'ugello', 'volcano nozzle', 'mosquito', 'revo', 'dragon hotend',
                       'rapido', 'phaetus', 'slice engineering', 'hardened nozzle', 'ruby nozzle']],
  ['extruders',       ['extruder', 'estrusore', 'bmg', 'orbiter', 'lgx', 'titan extruder', 'dual drive',
                       'sherpa mini', 'vz-hextrudort', 'bondtech', 'hemera']],
  ['pei-bed',         ['pei', 'build plate', 'spring steel', 'magnetic bed', 'piatto', 'garolite',
                       'flexible plate', 'bed surface', 'wham bam', 'ultem']],
  ['filament-dryer',  ['filament dryer', 'essiccatore', 'filament dry', 'dry box', 'sunlu dryer',
                       'polymaker dryer', 'filament storage']],
  ['maker-tools',     ['soldering', 'saldatore', 'multimeter', 'caliper', 'calibro', 'glue gun',
                       'colla a caldo', 'spatula', 'scraper', 'crimp', 'wire stripper', 'elettronica maker']],
  ['fdm-printers',    ['printer', 'stampante', '3d print']],                      // fallback
  ['hotends-nozzles', ['nozzle', 'ugello', 'hotend']],                             // fallback
  ['extruders',       ['extru', 'feeder', 'estrus']],                              // fallback
],
```

**In `'Smart Home'`** — aggiungi/espandi curtain-motors e energy-meters:

```typescript
['curtain-motors',  ['curtain motor', 'blind motor', 'tenda motorizzata', 'tendina elettrica',
                     'curtain controller', 'roller blind', 'smart blind', 'motorized curtain',
                     'somfy', 'ikea fyrtur', 'switchbot curtain', 'cover motore']],
['energy-meters',   ['energy meter', 'power meter', 'shelly em', 'clamp meter', 'contatore energia',
                     'misuratore consumo', 'watt meter', 'smart meter', 'power monitor',
                     'emporia', 'sense energy', 'efergy']],
```

**In `'trading-gaming-desk-accessories-premium'`** — espandi desk-accessories:

```typescript
['desk-accessories', ['desk mat', 'tappetino scrivania', 'cable management', 'monitor light',
                      'screen bar', 'key light', 'laptop arm', 'keyboard tray', 'webcam mount',
                      'monitor riser', 'desk organizer', 'cable tray', 'sotto scrivania',
                      'supporto cavo', 'hub usb desk', 'porta documenti']],
```

**In `'sim-racing-accessories-premium'`** — espandi shifters:

```typescript
['shifters', ['shifter', 'sequential', 'h-pattern', 'gearbox', 'cambio sequenziale', 'h shifter',
              'short shifter', 'sim shifter', 'fanatec shifter', 'heusinkveld', 'aps', 'pro shifter',
              'cambio h', 'v3 shifter', 'clubsport shifter']],
```

**In `'hardware-crypto-wallets'`** — aggiungi premium wallet keywords:

```typescript
['premium', ['stax', 'safe 5', 'touch', 'flex', 'coldcard mk', 'bitbox02', 'jade', 'keystone pro',
             'model t', 'shamir', 'cobo vault pro', 'ledger stax', 'ledger flex', 'coldcard q',
             'foundation passport', 'foundation v2', 'portal hardware']],
```

- [ ] **Step 2: Assicurati che i key `SUB_KW` in assign-subcategories.ts includano alias per '3D Printing'**

Dopo la sezione dei mapping (riga ~160 in assign-subcategories.ts), aggiungi se non presenti:

```typescript
SUB_KW['3D Printing'] = SUB_KW['3d-printing'] ?? SUB_KW['3D Printing'];
```

> Nota: verifica la struttura esatta del file prima di aggiungere — potrebbe già usare `'3D Printing'` come chiave diretta.

- [ ] **Step 3: Commit miglioramenti keyword**

```bash
git add scripts/assign-subcategories.ts
git commit -m "feat: espandi keyword map sub-categorie (PowerStation, FDM, Curtain, Shifters, Desk, Premium)"
```

---

## Task 3: Comando fill-gallery in kitwer-tools.ts

**Files:**
- Modify: `scripts/kitwer-tools.ts` (sezione router comandi, verso fine file)
- Modify: `kitwer-tools.sh` (sezione commento help)

- [ ] **Step 1: Aggiungi funzione fillGallery in kitwer-tools.ts**

Individua la sezione dei comandi in `kitwer-tools.ts` (la funzione `main()` con lo switch sui comandi). Aggiungi questa funzione prima di `main()`:

```typescript
// ── FILL-GALLERY ─────────────────────────────────────────────────────────────
/**
 * Scansiona prodotti senza image_url valida e tenta di recuperare
 * l'immagine tramite scraping Amazon (searchProductImage).
 * Limit: N prodotti per run (default 10) — esegui più volte.
 */
async function fillGallery(sb: SupabaseClient, opts: { limit?: number; dryRun?: boolean }) {
  const limit  = opts.limit ?? 10;
  const dryRun = opts.dryRun ?? false;
  banner('FILL-GALLERY', `Recupero immagini mancanti — limite ${limit} prodotti`);

  // Prendi prodotti senza image_url o con placeholder
  const { data: candidates, error } = await sb
    .from('products')
    .select('id, name, image_url, asin')
    .or('image_url.is.null,image_url.eq.,image_url.eq./placeholder.svg')
    .eq('is_active', true)
    .limit(limit);

  if (error) { log(C.red, 'ERR', error.message); return; }
  if (!candidates || candidates.length === 0) {
    log(C.green, 'FILL-GALLERY', 'Nessun prodotto senza immagine trovato.');
    return;
  }

  log(C.cyan, 'FILL-GALLERY', `Candidati: ${candidates.length}`);
  let fixed = 0;

  for (const prod of candidates) {
    // Prova prima ASIN se disponibile
    let urls: string[] = [];
    if (prod.asin) {
      urls = await fetchProductGallery(prod.asin);
    }
    // Fallback: search per nome
    if (urls.length === 0 || (urls.length === 1 && urls[0].includes(`/I/${prod.asin}.`))) {
      const found = await searchProductImage(prod.name);
      if (found) urls = [found];
    }

    if (urls.length === 0) {
      log(C.yellow, 'SKIP', `${prod.name.slice(0, 50)} — immagine non trovata`);
      continue;
    }

    log(C.green, 'FIX', `${prod.name.slice(0, 50)} → ${urls[0].slice(0, 60)}`);
    if (!dryRun) {
      await sb.from('products').update({
        image_url:  urls[0],
        image_urls: urls,
      }).eq('id', prod.id);
    }
    fixed++;
    await delay(2000, 4000); // anti-bot throttle
  }

  log(C.green, 'FILL-GALLERY', `Riparati: ${dryRun ? '[DRY-RUN]' : fixed}/${candidates.length}`);
}
```

- [ ] **Step 2: Aggiungi il routing del comando fill-gallery nella funzione main() di kitwer-tools.ts**

Trova lo switch/if-else dei comandi nella `main()` di `kitwer-tools.ts` e aggiungi:

```typescript
case 'fill-gallery': {
  const limit  = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '10', 10);
  const dryRun = process.argv.includes('--dry-run');
  await fillGallery(getSupabase(), { limit, dryRun });
  break;
}
```

- [ ] **Step 3: Aggiorna il commento help in kitwer-tools.sh**

```bash
# In kitwer-tools.sh, sostituisci la sezione #  Comandi disponibili: aggiungendo:
#    fill-gallery    → Recupera immagini mancanti via Amazon scraping
#
#  Esempi:
#    ./kitwer-tools.sh fill-gallery --limit=20
#    ./kitwer-tools.sh fill-gallery --all --dry-run
```

Edita il file `kitwer-tools.sh` aggiungendo la riga nel blocco commento.

- [ ] **Step 4: Commit fill-gallery**

```bash
git add scripts/kitwer-tools.ts kitwer-tools.sh
git commit -m "feat: aggiungi comando fill-gallery — recupero immagini mancanti"
```

---

## Task 4: Migliora deduplicazione (include product_url)

**Files:**
- Modify: `scripts/kitwer-tools.ts` (funzione dedup) oppure `scripts/dedup-products.ts`

- [ ] **Step 1: Leggi la funzione dedup esistente per trovare la logica di raggruppamento**

Apri `scripts/dedup-products.ts` e individua la funzione che raggruppa per `image_urls[0]`. Attualmente raggruppa solo per `image_url`.

- [ ] **Step 2: Aggiungi raggruppamento per product_url**

Nella funzione che esegue il fetch dei prodotti e costruisce i gruppi di duplicati (in `dedup-products.ts`), aggiungi questo secondo passaggio dopo il raggruppamento per `image_url`:

```typescript
// Raggruppamento per product_url (stesso prodotto, prezzi diversi)
const byProductUrl = new Map<string, Product[]>();
for (const p of products) {
  if (!p.affiliate_url) continue;
  // Normalizza URL: rimuovi parametri tracking (?tag=, &linkCode= ecc.)
  const normalizedUrl = p.affiliate_url
    .replace(/[?&](tag|linkCode|ascsubtag|ref)[^&]*/g, '')
    .replace(/[?&]$/, '');
  if (!normalizedUrl) continue;
  const existing = byProductUrl.get(normalizedUrl) ?? [];
  existing.push(p);
  byProductUrl.set(normalizedUrl, existing);
}

// Unisci i gruppi per URL con i gruppi per immagine
for (const [url, group] of byProductUrl.entries()) {
  if (group.length < 2) continue;
  // Se questi prodotti non sono già stati raggruppati per immagine, aggiungili
  const alreadyGrouped = group.every(p =>
    [...byImage.values()].some(g => g.length > 1 && g.some(gp => gp.id === p.id))
  );
  if (!alreadyGrouped) {
    byImage.set(`url:${url}`, group);
    log(C.yellow, 'URL-DUP', `Gruppo ${group.length} per URL: ${url.slice(0, 60)}`);
  }
}
```

> Nota: adatta i nomi delle variabili in base alla struttura effettiva trovata in `dedup-products.ts`. La variabile `byImage` è il Map usato per raggruppare per `image_url`.

- [ ] **Step 3: Strategia "keeper" — mantieni il prezzo più basso (o più recente)**

Nella logica che sceglie il "master" tra i duplicati, assicurati che:

```typescript
// Master = prodotto con prezzo più basso; se stesso prezzo → quello con created_at più recente
const master = group.reduce((best, p) => {
  if (p.price === null) return best;
  if (best.price === null) return p;
  if (p.price < best.price) return p;
  if (p.price === best.price) {
    // usa created_at o id come tiebreaker (id UUID v4 è ordinabile temporalmente)
    return p.id > best.id ? p : best;
  }
  return best;
}, group[0]);
```

- [ ] **Step 4: Commit miglioramento dedup**

```bash
git add scripts/dedup-products.ts
git commit -m "feat: dedup migliora — raggruppa anche per product_url, keeper = prezzo più basso"
```

---

## Task 5: Frontend — SubCategoryFilter "All" a fine lista

**Files:**
- Modify: `components/SubCategoryFilter.tsx`

Il file attuale ha il pill "All" **prima** dei sotto-categorie (riga 24). L'utente vuole "All" **alla fine**.

- [ ] **Step 1: Sposta il pill "All" dopo la `.map()` dei sub**

Sostituisci il contenuto di `components/SubCategoryFilter.tsx` con:

```tsx
'use client';

import { SUB_CATEGORIES } from '@/lib/products';

interface Props {
  category:       string;
  active:         string;
  onChange:       (sub: string) => void;
  activeCounts?:  Record<string, number>; // sub_id → count prodotti attivi
}

export default function SubCategoryFilter({ category, active, onChange, activeCounts }: Props) {
  const subs = SUB_CATEGORIES[category];
  if (!subs || subs.length === 0) return null;

  // Filtra sub-categorie con 0 prodotti se i conteggi sono disponibili
  const visibleSubs = activeCounts
    ? subs.filter(s => (activeCounts[s.id] ?? 0) > 0)
    : subs;

  if (visibleSubs.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide px-4 py-1.5 border-t border-zinc-800/60">
      <div className="flex items-center gap-2 min-w-max">
        {/* Label */}
        <span className="font-mono text-[8px] tracking-widest text-th-subtle uppercase shrink-0 mr-1">
          sub
        </span>

        {/* Sub-category pills */}
        {visibleSubs.map((sub) => {
          const isActive = active === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => onChange(isActive ? '' : sub.id)}
              className={`flex-shrink-0 inline-flex items-center px-2.5 h-6 rounded-full font-mono text-[10px] font-medium tracking-wide transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
                  : 'bg-zinc-900 text-th-subtle border border-zinc-700/40 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {sub.label}
            </button>
          );
        })}

        {/* "All" pill — ALLA FINE */}
        <button
          onClick={() => onChange('')}
          className={`flex-shrink-0 inline-flex items-center px-2.5 h-6 rounded-full font-mono text-[10px] font-medium tracking-wide transition-all duration-150 active:scale-95 ${
            active === ''
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.25)]'
              : 'bg-zinc-900 text-th-subtle border border-zinc-700/40 hover:border-zinc-600 hover:text-white'
          }`}
        >
          All
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit SubCategoryFilter**

```bash
git add components/SubCategoryFilter.tsx
git commit -m "fix: SubCategoryFilter — pill All spostato a fine lista, supporto activeCounts"
```

---

## Task 6: Frontend — Nascondi sub-categorie vuote (fetchSubCategoryCounts)

**Files:**
- Modify: `lib/products.ts`
- Modify: `components/HomepageClient.tsx`

- [ ] **Step 1: Aggiungi fetchSubCategoryCounts in lib/products.ts**

Alla fine di `lib/products.ts`, prima dell'export finale, aggiungi:

```typescript
/**
 * Ritorna un map sub_category → count prodotti attivi per una data categoria.
 * Usato da SubCategoryFilter per nascondere sub-cat vuote.
 */
export async function fetchSubCategoryCounts(
  category: string,
): Promise<Record<string, number>> {
  if (!category || category === 'all') return {};

  const { data, error } = await supabase
    .from('products')
    .select('sub_category')
    .eq('category', category)
    .eq('is_active', true)
    .not('sub_category', 'is', null);

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  for (const row of data) {
    if (row.sub_category) {
      counts[row.sub_category] = (counts[row.sub_category] ?? 0) + 1;
    }
  }
  return counts;
}
```

- [ ] **Step 2: Chiama fetchSubCategoryCounts in HomepageClient.tsx**

In `components/HomepageClient.tsx`, aggiungi lo stato e il fetch dei conteggi:

```typescript
// Aggiunge dopo gli useState esistenti (vicino a riga 58):
const [subCounts, setSubCounts] = useState<Record<string, number>>({});

// Aggiunge un useEffect che ri-fetcha i conteggi quando la categoria cambia:
useEffect(() => {
  if (!category || category === 'all') { setSubCounts({}); return; }
  fetchSubCategoryCounts(category).then(setSubCounts);
}, [category]);
```

Aggiungi l'import in cima al file:

```typescript
import { Category, PAGE_SIZE, fetchSubCategoryCounts } from '@/lib/products';
```

- [ ] **Step 3: Passa activeCounts a SubCategoryFilter nel JSX**

Trova il tag `<SubCategoryFilter` in `HomepageClient.tsx` e aggiungi la prop:

```tsx
<SubCategoryFilter
  category={category}
  active={subCategory}
  onChange={handleSubCategoryChange}
  activeCounts={subCounts}
/>
```

- [ ] **Step 4: Commit sub-cat counts**

```bash
git add lib/products.ts components/HomepageClient.tsx
git commit -m "feat: nasconde sub-categorie vuote — fetchSubCategoryCounts + activeCounts prop"
```

---

## Task 7: Frontend — Immagini prodotti in sconto zoomabili (lightbox)

**Files:**
- Modify: `components/TacticalDealsSection.tsx`

Il DealCard ha l'immagine in un `<div className="relative aspect-square">` senza click handler.
Aggiungiamo un lightbox inline senza dipendenze extra.

- [ ] **Step 1: Aggiungi stato lightbox e componente LightboxModal in TacticalDealsSection.tsx**

Aggiungi il componente lightbox prima di `DealCard`:

```tsx
// ── Lightbox ───────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  // Chiudi su Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white font-mono text-2xl leading-none"
        aria-label="Chiudi"
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Aggiungi stato lightbox dentro DealCard e click handler sull'immagine**

Nel componente `DealCard`, aggiungi lo stato:

```typescript
const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
```

Poi nel JSX, trasforma il `<div className="relative aspect-square ...">` dell'immagine aggiungendo `cursor-zoom-in` e `onClick`:

```tsx
{/* Image container */}
<div
  className="relative aspect-square bg-zinc-950 overflow-hidden cursor-zoom-in"
  onClick={() => setZoomedSrc(imgSrc)}
  title="Clicca per ingrandire"
>
  {/* ... img esistente invariata ... */}

  {/* Lightbox */}
  {zoomedSrc && (
    <Lightbox
      src={zoomedSrc}
      alt={deal.name}
      onClose={() => setZoomedSrc(null)}
    />
  )}
</div>
```

- [ ] **Step 3: Verifica che useEffect sia già importato (è già presente in TacticalDealsSection.tsx riga 3)**

```typescript
// riga 3 già ha: import { useState, useEffect, useRef, useMemo } from 'react';
// Nessun import aggiuntivo necessario.
```

- [ ] **Step 4: Commit lightbox**

```bash
git add components/TacticalDealsSection.tsx
git commit -m "feat: zoom lightbox su immagini prodotti in sconto (TacticalDealsSection)"
```

---

## Task 8: Esecuzione script DB + comandi kitwer-tools

- [ ] **Step 1: Esegui catalog-surgery in dry-run**

```bash
npx tsx scripts/catalog-surgery.ts --dry-run
```

Expected: report con conteggi, nessuna modifica.

- [ ] **Step 2: Esegui catalog-surgery per davvero (solo dopo aver verificato il dry-run)**

```bash
npx tsx scripts/catalog-surgery.ts
```

Expected: report finale con numeri reali di prodotti modificati/eliminati.

- [ ] **Step 3: Esegui dedup**

```bash
./kitwer-tools.sh dedup
```

Expected: report duplicati rimossi per image_url e product_url.

- [ ] **Step 4: Esegui subcats per ri-assegnare sub-categorie**

```bash
./kitwer-tools.sh subcats
```

Expected: ogni prodotto ottiene una sub_category keyword-based.

- [ ] **Step 5: Esegui fill-gallery per recupero immagini (10 prodotti per run)**

```bash
./kitwer-tools.sh fill-gallery --limit=10
```

Expected: fino a 10 prodotti senza immagine ricevono un image_url da Amazon.
Ripetere il comando fino a copertura completa.

- [ ] **Step 6: Commit log operazioni**

```bash
git add -A
git commit -m "ops: catalog surgery eseguita — anomalie eliminate, subcats rissegnate, gallery riparata"
```

---

## Checklist Spec Coverage

| Requisito | Task |
|-----------|------|
| Rimuovi monopattino da FPV→Frames | Task 1, Step 2 |
| Rimuovi smartwatch da 3D Printing | Task 1, Step 2 |
| Rimuovi drone da Crypto→Air-Gapped | Task 1, Step 2 |
| Fix Faraday duplicati in Crypto Wallets | Task 1, Step 3 |
| Elimina sub_category "general" da Power Grid | Task 1, Step 4 |
| Survival & DC → is_active = false | Task 1, Step 5 |
| Report finale operazioni | Task 1, Step 6 |
| Dedup aggressivo (product_url + image_url) | Task 4 |
| fill-gallery per immagini mancanti | Task 3 |
| Keyword mapping sub-cat vuote | Task 2 |
| Sub-cat vuote nascoste nel menu | Task 6 |
| "All" a fine filtro sub-categorie | Task 5 |
| Immagini prodotti in sconto zoomabili | Task 7 |
