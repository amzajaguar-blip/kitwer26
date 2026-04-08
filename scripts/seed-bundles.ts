#!/usr/bin/env tsx
/**
 * seed-bundles.ts — Inserisce i bundle curati di Kitwer26 nel DB Supabase.
 *
 * Uso:
 *   npx tsx scripts/seed-bundles.ts            # dry-run (default)
 *   npx tsx scripts/seed-bundles.ts --write    # scrive effettivamente nel DB
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync }  from 'fs';
import { resolve }       from 'path';

// ── ENV ──────────────────────────────────────────────────────────────────────
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
  } catch { /* variabili già nel processo */ }
}
loadEnv();

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// ── Bundle definitions ───────────────────────────────────────────────────────
// Prezzi finali (già curati — nessun markup da applicare).
// affiliate_url = link Amazon principale del kit.
const BUNDLES = [
  {
    name:          'Kitwer26 Crypto Fortress Bundle',
    slug:          'kitwer26-crypto-fortress-bundle',
    description:   'Setup cold-storage definitivo: hardware wallet + piastra seed in acciaio inox resistente a 1200°C. La soluzione completa per la self-custody generazionale.',
    price:         219.99,
    category:      'hardware-crypto-wallets',
    sub_category:  'backup-seed',
    affiliate_url: 'https://www.amazon.it/s?k=ledger+nano+x+billfodl+seed+plate&tag=kitwer26-21',
    image_url:     null,
    image_urls:    null,
    is_budget_king: false,
  },
  {
    name:          'Kitwer26 DJI Mini Power Pack',
    slug:          'kitwer26-dji-mini-power-pack',
    description:   'DJI Mini 3 Pro + 2 batterie Tattu Intelligent Flight Battery. Fino a 120 minuti operativi con swap rapido. Zero down-time tra una sessione e l\'altra.',
    price:         179.99,
    category:      'fpv-drones-tech',
    sub_category:  'drones-accessories',
    affiliate_url: 'https://www.amazon.it/s?k=dji+mini+3+pro+batterie+tattu&tag=kitwer26-21',
    image_url:     null,
    image_urls:    null,
    is_budget_king: false,
  },
  {
    name:          'Kitwer26 Casa Sicura Total Bundle',
    slug:          'kitwer26-casa-sicura-total-bundle',
    description:   'Kit perimetrale completo: serratura smart ULTRALOQ + telecamera solare 4K Hiseeu. Da "serratura sola" a "sistema di sorveglianza no-fili" in un solo acquisto.',
    price:         299.00,
    category:      'Smart Security',
    sub_category:  null,
    affiliate_url: 'https://www.amazon.it/s?k=ultraloq+hiseeu+kit+sicurezza+casa&tag=kitwer26-21',
    image_url:     null,
    image_urls:    null,
    is_budget_king: false,
  },
  {
    name:          'Kitwer26 Sim Pro Starter Bundle',
    slug:          'kitwer26-sim-pro-starter-bundle',
    description:   'Setup sim racing entry-pro: MOZA R3 + XP1 Loadcell Brake Mod. Da "volante base" a "setup lap record". Il bundle che separa i casual dai competitivi.',
    price:         299.00,
    category:      'sim-racing-accessories-premium',
    sub_category:  'pedals',
    affiliate_url: 'https://www.amazon.it/s?k=moza+r3+xp1+loadcell+sim+racing&tag=kitwer26-21',
    image_url:     null,
    image_urls:    null,
    is_budget_king: false,
  },
  {
    name:          'Kitwer26 FPV Creator Kit Bundle',
    slug:          'kitwer26-fpv-creator-kit-bundle',
    description:   'Kit cinematico completo: GEPRC Cinelog30 O4 + RadioMaster Pocket ELRS. Da "drone solo" a "ready-to-fly cinematico". Il setup per chi vuole immagini professionali dal giorno uno.',
    price:         299.00,
    category:      'fpv-drones-tech',
    sub_category:  'racing-drones',
    affiliate_url: 'https://www.amazon.it/s?k=geprc+cinelog30+radiomaster+pocket+elrs&tag=kitwer26-21',
    image_url:     null,
    image_urls:    null,
    is_budget_king: false,
  },
] as const;

// ── Main ─────────────────────────────────────────────────────────────────────
const DRY_RUN = !process.argv.includes('--write');

async function main() {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║  Kitwer26 Bundle Seeder               ║`);
  console.log(`║  Mode: ${DRY_RUN ? 'DRY-RUN (usa --write per DB)' : '🔴 WRITE MODE — scrive nel DB'} ║`);
  console.log(`╚═══════════════════════════════════════╝\n`);

  if (DRY_RUN) {
    console.log('Preview bundle da inserire:\n');
    for (const b of BUNDLES) {
      console.log(`  [${b.slug}]`);
      console.log(`    name:  ${b.name}`);
      console.log(`    price: €${b.price}`);
      console.log(`    cat:   ${b.category}`);
      console.log(`    url:   ${b.affiliate_url.slice(0, 60)}...`);
      console.log();
    }
    console.log('Nessun dato scritto. Esegui con --write per procedere.\n');
    return;
  }

  const sb = getSupabase();

  for (const bundle of BUNDLES) {
    // Controlla se esiste già per slug
    const { data: existing } = await sb
      .from('products')
      .select('id, name, price')
      .eq('slug', bundle.slug)
      .maybeSingle();

    if (existing) {
      console.log(`SKIP  "${bundle.name}" — già presente (id: ${existing.id}, price: €${existing.price})`);
      continue;
    }

    const { data, error } = await sb
      .from('products')
      .insert({
        name:           bundle.name,
        slug:           bundle.slug,
        description:    bundle.description,
        price:          bundle.price,
        category:       bundle.category,
        sub_category:   bundle.sub_category,
        affiliate_url:  bundle.affiliate_url,
        image_url:      bundle.image_url,
        image_urls:     bundle.image_urls,
        is_budget_king: bundle.is_budget_king,
        is_price_pending: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`ERR   "${bundle.name}": ${error.message}`);
    } else {
      console.log(`OK    "${bundle.name}" → id: ${data.id}`);
    }
  }

  console.log('\nSeed completato.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
