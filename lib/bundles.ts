/**
 * lib/bundles.ts — Bundle Strategici Tattici (AOV-Optimized)
 *
 * STRATEGIE DI PRICING:
 *   'discount5'  (legacy) → bundlePrice = totalValue × 0.95
 *   'margin20'   (elite)  → bundlePrice = Σcost / 0.8 (garantisce 20% margine netto)
 *                           barratoPrice = bundlePrice × 1.07 (prezzo psicologico)
 *
 * Selezione slot (gerarchia):
 *   1. sub_category match + price DESC
 *   2. categoria madre + price DESC (fallback)
 *
 * Deduplication: ogni prodotto usato max 1 slot per bundle.
 */

import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface BundleSlotProduct {
  id:             string;
  name:           string;
  price:          number;
  image_url:      string | null;
  image_urls:     string[] | null;
  product_url:    string | null;
  sub_category:   string | null;
  variants:       Array<{ name: string; values: string[]; images?: Record<string, string> }> | null;
  is_budget_king: boolean;
  is_top_tier:    boolean;
}

interface SlotConfig {
  label:              string;
  subCategories:      string[];
  categories:         string[];
  fallbackCategories: string[];
}

interface BundleConfig {
  id:            string;
  title:         string;
  subtitle:      string;
  badge:         string;
  badgeColor:    'orange' | 'amber' | 'cyan' | 'purple';
  description:   string;
  highlight:     string;
  /** Scarsità psicologica mostrata nella card */
  scarcityUnits: number;
  /** discount5: bundlePrice=totalValue×0.95 | margin20: bundlePrice=totalValue/0.8 */
  pricingMode:   'discount5' | 'margin20';
  slots:         SlotConfig[];
}

export interface ResolvedBundle {
  id:            string;
  title:         string;
  subtitle:      string;
  badge:         string;
  badgeColor:    'orange' | 'amber' | 'cyan' | 'purple';
  description:   string;
  highlight:     string;
  scarcityUnits: number;
  slotLabels:    string[];
  products:      BundleSlotProduct[];
  totalValue:    number;
  /** Prezzo finale che il cliente paga */
  bundlePrice:   number;
  /** Prezzo barrato psicologico (più alto del bundlePrice) */
  barratoPrice:  number;
  /** Percentuale di sconto visibile rispetto al barratoPrice */
  discountPct:   number;
  isComplete:    boolean;
}

// ── Bundle Configs ─────────────────────────────────────────────────────────────

const BUNDLE_CONFIGS: BundleConfig[] = [
  // ── Bundle 1: Cold Storage ────────────────────────────────────────────────
  {
    id:            'cold-storage',
    title:         'COLD STORAGE FORTRESS',
    subtitle:      'TARGET: CRYPTO HOLDER',
    badge:         'DEFCON 1',
    badgeColor:    'orange',
    scarcityUnits: 3,
    pricingMode:   'discount5',
    description:   'Il trifoglio della custodia cripto offline. Firma le transazioni in aria, archivia il seed in titanio e blocca i segnali RF. Nessuna minaccia digitale può raggiungerti.',
    highlight:     'Protezione Totale 360° · Firma offline · Seed indistruttibile',
    slots: [
      {
        label:              'Premium Wallet',
        subCategories:      ['premium', 'air-gapped'],
        categories:         ['hardware-crypto-wallets'],
        fallbackCategories: ['hardware-crypto-wallets'],
      },
      {
        label:              'Backup Seed',
        subCategories:      ['backup-seed'],
        categories:         ['hardware-crypto-wallets'],
        fallbackCategories: ['hardware-crypto-wallets'],
      },
      {
        label:              'Faraday / RFID',
        subCategories:      ['rfid-faraday'],
        categories:         ['comms-security-shield'],
        fallbackCategories: ['comms-security-shield'],
      },
    ],
  },

  // ── Bundle 2: Ghost Operator ──────────────────────────────────────────────
  {
    id:            'ghost-operator',
    title:         'GHOST OPERATOR',
    subtitle:      'TARGET: PRIVACY FIRST',
    badge:         'DEFCON 1',
    badgeColor:    'orange',
    scarcityUnits: 2,
    pricingMode:   'discount5',
    description:   'Autenticazione fisica a due fattori, nessuna impronta digitale sul monitor, accesso biometrico ai dati. Operativo silenzioso, tracce zero.',
    highlight:     'Zero tracce · 2FA hardware · Accesso biometrico',
    slots: [
      {
        label:              'Security Key',
        subCategories:      ['security-key'],
        categories:         ['comms-security-shield'],
        fallbackCategories: ['comms-security-shield'],
      },
      {
        label:              'Privacy Screen',
        subCategories:      ['privacy-screen'],
        categories:         ['comms-security-shield'],
        fallbackCategories: ['comms-security-shield'],
      },
      {
        label:              'Encrypted Comms',
        subCategories:      ['encrypted-comms'],
        categories:         ['comms-security-shield'],
        fallbackCategories: ['comms-security-shield'],
      },
    ],
  },

  // ── Bundle 3: Apex Command ────────────────────────────────────────────────
  {
    id:            'apex-command',
    title:         'APEX COMMAND CENTER',
    subtitle:      'PRO RACING SETUP',
    badge:         'DEFCON 0 — ELITE TIER',
    badgeColor:    'amber',
    scarcityUnits: 2,
    pricingMode:   'discount5',
    description:   'Non limitarti a giocare, pilota. Setup professionale per feedback estremo e realismo totale. Plug-and-Play per i principali simulatori (iRacing, Assetto Corsa). La pista ti aspetta.',
    highlight:     'Compatibile con la maggior parte dei volanti Direct Drive sul mercato',
    slots: [
      {
        label:              'Cockpit / Rig',
        subCategories:      ['cockpits-seats'],
        categories:         ['sim-racing-accessories-premium'],
        fallbackCategories: ['sim-racing-accessories-premium'],
      },
      {
        label:              'Volante DD',
        subCategories:      ['steering-wheels'],
        categories:         ['sim-racing-accessories-premium'],
        fallbackCategories: ['sim-racing-accessories-premium'],
      },
      {
        label:              'Shifter / Freno a mano',
        subCategories:      ['shifters-handbrakes'],
        categories:         ['sim-racing-accessories-premium'],
        fallbackCategories: ['sim-racing-accessories-premium'],
      },
    ],
  },

  // ── Bundle 4: THERMAL OVERWATCH UNIT ─────────────────────────────────────
  // Amazon cost: €349 + €289 + €229 = €867
  // Kitwer price: €867 / 0.8 = €1,083.75 (margine 20%)
  // Barrato: €1,083.75 × 1.07 = €1,159.61
  {
    id:            'thermal-overwatch',
    title:         '[ THERMAL OVERWATCH UNIT ]',
    subtitle:      'TARGET: SORVEGLIANZA AUTONOMA',
    badge:         'CLASSIFIED — ELITE TIER',
    badgeColor:    'amber',
    scarcityUnits: 2,
    pricingMode:   'margin20',
    description:   'Sistema di sorveglianza autonoma a 360°. Camera AI 4K con visione notturna, hub sicurezza wireless con sirena e sensori, serratura smart con accesso remoto criptato. Il tuo perimetro non dorme mai.',
    highlight:     'Copertura totale perimetro · Visione notturna AI · Accesso criptato da remoto',
    slots: [
      {
        label:              'Telecamera AI 4K',
        subCategories:      ['smart-cameras'],
        categories:         ['sicurezza-domotica-high-end', 'Smart Security'],
        fallbackCategories: ['sicurezza-domotica-high-end', 'Smart Security'],
      },
      {
        label:              'Sistema Allarme Hub',
        subCategories:      ['alarm-systems'],
        categories:         ['sicurezza-domotica-high-end', 'Smart Security'],
        fallbackCategories: ['sicurezza-domotica-high-end', 'Smart Security'],
      },
      {
        label:              'Smart Lock Criptato',
        subCategories:      ['smart-locks'],
        categories:         ['sicurezza-domotica-high-end', 'Smart Security'],
        fallbackCategories: ['sicurezza-domotica-high-end', 'Smart Security'],
      },
    ],
  },

  // ── Bundle 5: SOVEREIGN COMPUTE NODE ─────────────────────────────────────
  // Amazon cost: €1,179 + €549 + €349 = €2,077
  // Kitwer price: €2,077 / 0.8 = €2,596.25 (margine 20%)
  // Barrato: €2,596.25 × 1.07 = €2,777.99
  {
    id:            'sovereign-compute',
    title:         '[ SOVEREIGN COMPUTE NODE ]',
    subtitle:      'TARGET: AI / WORKSTATION ULTRA',
    badge:         'CLASSIFIED — ELITE TIER',
    badgeColor:    'amber',
    scarcityUnits: 1,
    pricingMode:   'margin20',
    description:   'Nodo di calcolo sovrano per AI, crypto mining e rendering estremo. GPU di ultima generazione, CPU ad alta frequenza e DDR5 a doppio canale. Costruisci il tuo server di potenza off-grid.',
    highlight:     'Potenza di calcolo AI-grade · DDR5 dual channel · Architettura scalabile',
    slots: [
      {
        label:              'GPU Ultra',
        subCategories:      ['gpus'],
        categories:         ['pc-hardware-high-ticket', 'PC Hardware'],
        fallbackCategories: ['pc-hardware-high-ticket', 'PC Hardware'],
      },
      {
        label:              'CPU Sovrano',
        subCategories:      ['cpus'],
        categories:         ['pc-hardware-high-ticket', 'PC Hardware'],
        fallbackCategories: ['pc-hardware-high-ticket', 'PC Hardware'],
      },
      {
        label:              'RAM DDR5 64GB',
        subCategories:      ['memory'],
        categories:         ['pc-hardware-high-ticket', 'PC Hardware'],
        fallbackCategories: ['pc-hardware-high-ticket', 'PC Hardware'],
      },
    ],
  },
];

// ── Query helpers ──────────────────────────────────────────────────────────────

const PRODUCT_SELECT =
  'id, name, price, image_url, image_urls, product_url, sub_category, variants, is_budget_king';

async function fetchSlotProduct(
  slot: SlotConfig,
  usedIds: string[],
): Promise<BundleSlotProduct | null> {

  // Fase 1: sub_category match + price DESC (tutti in parallelo)
  const phase1Results = await Promise.all(
    slot.subCategories.map((sub) =>
      supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .in('category', slot.categories)
        .eq('sub_category', sub)
        .eq('is_active', true)
        .order('price', { ascending: false })
        .limit(10)
    )
  );

  for (const { data } of phase1Results) {
    const candidate = (data ?? []).find((p) => !usedIds.includes(p.id));
    if (candidate) return { ...(candidate as BundleSlotProduct), is_top_tier: true };
  }

  // Fase 2: fallback categoria madre + price DESC
  const { data: fallback } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .in('category', slot.fallbackCategories)
    .not('image_url', 'is', null)
    .eq('is_active', true)
    .order('price', { ascending: false })
    .limit(10);

  const candidate = (fallback ?? []).find((p) => !usedIds.includes(p.id));
  return candidate ? { ...(candidate as BundleSlotProduct), is_top_tier: false } : null;
}

// ── Pricing engine ─────────────────────────────────────────────────────────────

function calcPricing(
  totalValue: number,
  mode: 'discount5' | 'margin20',
): { bundlePrice: number; barratoPrice: number; discountPct: number } {
  if (mode === 'margin20') {
    // Margine netto 20% garantito: bundlePrice = cost / 0.8
    const bundlePrice  = Math.round((totalValue / 0.8) * 100) / 100;
    const barratoPrice = Math.round(bundlePrice * 1.07 * 100) / 100;
    const discountPct  = Math.round((1 - bundlePrice / barratoPrice) * 100);
    return { bundlePrice, barratoPrice, discountPct };
  }
  // Legacy: 5% sconto rispetto al totale individuale
  const bundlePrice  = Math.round(totalValue * 0.95 * 100) / 100;
  const barratoPrice = Math.round(totalValue * 100) / 100;
  const discountPct  = 5;
  return { bundlePrice, barratoPrice, discountPct };
}

// ── Bundle resolver ────────────────────────────────────────────────────────────

async function resolveBundle(config: BundleConfig): Promise<ResolvedBundle> {
  const usedIds:  string[]           = [];
  const products: BundleSlotProduct[] = [];

  for (const slot of config.slots) {
    const product = await fetchSlotProduct(slot, usedIds);
    if (product) {
      products.push(product);
      usedIds.push(product.id);
    }
  }

  const totalValue                    = products.reduce((sum, p) => sum + (p.price ?? 0), 0);
  const { bundlePrice, barratoPrice, discountPct } = calcPricing(totalValue, config.pricingMode);

  return {
    id:            config.id,
    title:         config.title,
    subtitle:      config.subtitle,
    badge:         config.badge,
    badgeColor:    config.badgeColor,
    description:   config.description,
    highlight:     config.highlight,
    scarcityUnits: config.scarcityUnits,
    slotLabels:    config.slots.map((s) => s.label),
    products,
    totalValue,
    bundlePrice,
    barratoPrice,
    discountPct,
    isComplete:    products.length === config.slots.length,
  };
}

export async function getStrategicBundles(): Promise<ResolvedBundle[]> {
  return Promise.all(BUNDLE_CONFIGS.map(resolveBundle));
}

// ── Static metadata (no DB — usato da generateStaticParams e generateMetadata) ─

export interface BundleMeta {
  id:           string;
  title:        string;
  subtitle:     string;
  badge:        string;
  badgeColor:   'orange' | 'amber' | 'cyan' | 'purple';
  description:  string;
  highlight:    string;
  scarcityUnits: number;
  slotLabels:   string[];
}

export const BUNDLE_META: BundleMeta[] = BUNDLE_CONFIGS.map((c) => ({
  id:           c.id,
  title:        c.title,
  subtitle:     c.subtitle,
  badge:        c.badge,
  badgeColor:   c.badgeColor,
  description:  c.description,
  highlight:    c.highlight,
  scarcityUnits: c.scarcityUnits,
  slotLabels:   c.slots.map((s) => s.label),
}));

export async function resolveBundleById(id: string): Promise<ResolvedBundle | null> {
  const config = BUNDLE_CONFIGS.find((c) => c.id === id);
  if (!config) return null;
  return resolveBundle(config);
}
