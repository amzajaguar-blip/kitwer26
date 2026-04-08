/**
 * scripts/stripe-seed-products.ts
 *
 * Crea i 5 bundle KITWER26 su Stripe con 3 prezzi per prodotto (EUR, GBP, USD).
 * I prezzi vengono calcolati in tempo reale da Supabase (prezzi reali dei prodotti).
 *
 * USO:
 *   npx tsx scripts/stripe-seed-products.ts
 *
 * PREREQUISITI:
 *   - STRIPE_SECRET_KEY nel .env.local
 *   - NEXT_PUBLIC_SUPABASE_URL nel .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY nel .env.local
 *
 * OUTPUT:
 *   Stampa il JSON con i Product ID e Price ID creati su Stripe.
 *   Salva anche in scripts/stripe-product-ids.json per riferimento.
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
import { resolve } from 'path';

// Carica .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// ── Exchange rates (da lib/currency.ts) ──────────────────────────────────────
const EUR_RATES: Record<string, number> = {
  EUR: 1.00,
  GBP: 0.85,
  USD: 1.08,
};

// ── Bundle configs (mirror di lib/bundles.ts — solo dati statici) ─────────────
const BUNDLES = [
  {
    id:          'cold-storage',
    title:       'COLD STORAGE FORTRESS',
    description: 'Il trifoglio della custodia cripto offline. Firma le transazioni in aria, archivia il seed in titanio e blocca i segnali RF.',
    pricingMode: 'discount5' as const,
    slots: [
      { subCategories: ['premium', 'air-gapped'],    categories: ['hardware-crypto-wallets'] },
      { subCategories: ['backup-seed'],              categories: ['hardware-crypto-wallets'] },
      { subCategories: ['rfid-faraday'],             categories: ['comms-security-shield'] },
    ],
  },
  {
    id:          'ghost-operator',
    title:       'GHOST OPERATOR',
    description: 'Autenticazione fisica a due fattori, nessuna impronta digitale sul monitor, accesso biometrico ai dati. Zero tracce.',
    pricingMode: 'discount5' as const,
    slots: [
      { subCategories: ['security-key'],     categories: ['comms-security-shield'] },
      { subCategories: ['privacy-screen'],   categories: ['comms-security-shield'] },
      { subCategories: ['encrypted-comms'],  categories: ['comms-security-shield'] },
    ],
  },
  {
    id:          'apex-command',
    title:       'APEX COMMAND CENTER',
    description: 'Setup professionale per feedback estremo e realismo totale. Compatibile con iRacing, Assetto Corsa.',
    pricingMode: 'discount5' as const,
    slots: [
      { subCategories: ['cockpits-seats'],      categories: ['sim-racing-accessories-premium'] },
      { subCategories: ['steering-wheels'],     categories: ['sim-racing-accessories-premium'] },
      { subCategories: ['shifters-handbrakes'], categories: ['sim-racing-accessories-premium'] },
    ],
  },
  {
    id:          'thermal-overwatch',
    title:       'THERMAL OVERWATCH UNIT',
    description: 'Sistema di sorveglianza autonoma a 360°. Camera AI 4K, hub sicurezza wireless, serratura smart criptata.',
    pricingMode: 'margin20' as const,
    slots: [
      { subCategories: ['smart-cameras'],   categories: ['sicurezza-domotica-high-end', 'Smart Security'] },
      { subCategories: ['alarm-systems'],   categories: ['sicurezza-domotica-high-end', 'Smart Security'] },
      { subCategories: ['smart-locks'],     categories: ['sicurezza-domotica-high-end', 'Smart Security'] },
    ],
  },
  {
    id:          'sovereign-compute',
    title:       'SOVEREIGN COMPUTE NODE',
    description: 'Nodo di calcolo sovrano per AI, crypto mining e rendering estremo. GPU, CPU e DDR5 di ultima generazione.',
    pricingMode: 'margin20' as const,
    slots: [
      { subCategories: ['gpus'],    categories: ['pc-hardware-high-ticket', 'PC Hardware'] },
      { subCategories: ['cpus'],    categories: ['pc-hardware-high-ticket', 'PC Hardware'] },
      { subCategories: ['memory'],  categories: ['pc-hardware-high-ticket', 'PC Hardware'] },
    ],
  },
];

// ── Pricing engine ────────────────────────────────────────────────────────────
function calcBundlePrice(totalValue: number, mode: 'discount5' | 'margin20'): number {
  if (mode === 'margin20') {
    return Math.round((totalValue / 0.8) * 100) / 100;
  }
  return Math.round(totalValue * 0.95 * 100) / 100;
}

// ── Supabase: fetch slot price ────────────────────────────────────────────────
async function fetchSlotPrice(
  supabase: ReturnType<typeof createClient>,
  slot: { subCategories: string[]; categories: string[] },
  usedIds: string[],
): Promise<{ id: string; price: number } | null> {
  for (const sub of slot.subCategories) {
    const { data } = await supabase
      .from('products')
      .select('id, price')
      .in('category', slot.categories)
      .eq('sub_category', sub)
      .gt('price', 0)
      .order('price', { ascending: false })
      .limit(10);

    const candidate = (data ?? []).find((p: { id: string }) => !usedIds.includes(p.id));
    if (candidate) return candidate as { id: string; price: number };
  }

  // Fallback: categoria madre
  const { data: fallback } = await supabase
    .from('products')
    .select('id, price')
    .in('category', slot.categories)
    .not('image_url', 'is', null)
    .gt('price', 0)
    .order('price', { ascending: false })
    .limit(10);

  const candidate = (fallback ?? []).find((p: { id: string }) => !usedIds.includes(p.id));
  return candidate ? (candidate as { id: string; price: number }) : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const stripeKey  = process.env.STRIPE_SECRET_KEY;
  const sbUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey      = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!stripeKey) throw new Error('STRIPE_SECRET_KEY mancante in .env.local');
  if (!sbUrl || !sbKey) throw new Error('SUPABASE env mancanti in .env.local');

  const stripe   = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion });
  const supabase = createClient(sbUrl, sbKey);

  const results: Record<string, { productId: string; prices: Record<string, string> }> = {};

  for (const bundle of BUNDLES) {
    console.log(`\n── Elaborazione bundle: ${bundle.title} ──`);

    // 1. Calcola prezzo EUR dal DB
    const usedIds: string[] = [];
    let totalValue = 0;

    for (const slot of bundle.slots) {
      const product = await fetchSlotPrice(supabase, slot, usedIds);
      if (product) {
        totalValue += product.price;
        usedIds.push(product.id);
        console.log(`   Slot trovato: id=${product.id} price=€${product.price}`);
      } else {
        console.warn(`   ⚠ Nessun prodotto trovato per slot ${JSON.stringify(slot.subCategories)}`);
      }
    }

    const bundlePriceEur = calcBundlePrice(totalValue, bundle.pricingMode);
    console.log(`   Totale valore: €${totalValue.toFixed(2)} → Prezzo bundle EUR: €${bundlePriceEur.toFixed(2)}`);

    if (bundlePriceEur <= 0) {
      console.warn(`   ⚠ Prezzo bundle €0 — bundle saltato (prodotti mancanti su Supabase)`);
      continue;
    }

    // 2. Crea/aggiorna Stripe Product
    const stripeProduct = await stripe.products.create({
      name:        `KITWER26 — ${bundle.title}`,
      description: bundle.description,
      metadata: {
        bundle_id:    bundle.id,
        pricing_mode: bundle.pricingMode,
        kitwer26:     'true',
      },
      url: `https://www.kitwer26.com/bundle/${bundle.id}`,
    });
    console.log(`   ✅ Stripe Product creato: ${stripeProduct.id}`);

    // 3. Crea 3 prezzi: EUR, GBP, USD
    const priceIds: Record<string, string> = {};

    for (const [currency, rate] of Object.entries(EUR_RATES)) {
      const amountInCurrency = Math.round(bundlePriceEur * rate * 100); // centesimi
      const price = await stripe.prices.create({
        product:     stripeProduct.id,
        currency:    currency.toLowerCase(),
        unit_amount: amountInCurrency,
        nickname:    `${bundle.title} — ${currency}`,
        lookup_key:  `${bundle.id}_${currency.toLowerCase()}`,
        transfer_lookup_key: true,
        metadata: {
          bundle_id:    bundle.id,
          currency_code: currency,
          eur_base:     String(bundlePriceEur),
        },
      });
      priceIds[currency] = price.id;
      console.log(`   ✅ Price ${currency}: ${price.id} (${currency} ${(amountInCurrency / 100).toFixed(2)})`);
    }

    results[bundle.id] = { productId: stripeProduct.id, prices: priceIds };
  }

  // 4. Salva risultati
  const outputPath = resolve(process.cwd(), 'scripts/stripe-product-ids.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));

  console.log('\n── RISULTATI FINALI ──');
  console.log(JSON.stringify(results, null, 2));
  console.log(`\n✅ Salvato in: ${outputPath}`);
  console.log('\nCopia i price IDs come env vars se vuoi usarli nel checkout (opzionale).');
  console.log('Il checkout usa già price_data dinamici — questi ID sono per il catalogo Stripe.');
}

main().catch((err) => {
  console.error('ERRORE:', err);
  process.exit(1);
});
