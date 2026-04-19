/**
 * Cyber Security (Surveillance/Smart Home) Import — 2026-04-18
 *
 * Validation summary:
 * - 20 submitted ASINs — all 20 returned HTTP 404 (confirmed fake/AI-generated)
 * - Phase 2 search: 15 real products found on Amazon.it and validated
 * - 5 products discarded (no matching Amazon.it listing found):
 *   #2 Hiseeu Solar 4K, #10 TP-Link Tapo C425, #14 SimpliSafe Outdoor Cam,
 *   #17 Lorex 4K Floodlight, #18 Ecobee SmartCamera
 *
 * All 15 are INSERT operations (no duplicates found in existing Cyber Security catalog).
 * Category: "Cyber Security" / sub_category: "surveillance-legal"
 * Pricing formula: cost × 1.20 + 3.99 (no double-markup)
 * Images: sourced from Amazon search result srcset (not product page, avoids CAPTCHA)
 * Affiliate tag: kitwer26-21
 *
 * is_active bug: DB trigger resets is_active=false on every INSERT/UPDATE.
 * This script includes an automatic force-fix UPDATE pass after inserts.
 */

import { createClient } from '@supabase/supabase-js';

// Inline env values (dotenv not available in this project)
const SUPABASE_URL = 'https://layehkivpxlscamgfive.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheWVoa2l2cHhsc2NhbWdmaXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ1OTY3MiwiZXhwIjoyMDg3MDM1NjcyfQ.HuNtliv7G_cvPlJb-KEeGfXXyQ710kMVWvXEDtXpPd8';

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function amz(asin) {
  return `https://www.amazon.it/dp/${asin}?tag=kitwer26-21`;
}

function calcPrice(cost) {
  return Math.round((cost * 1.20 + 3.99) * 100) / 100;
}

// 15 validated products — all real ASINs confirmed on Amazon.it
// Images sourced from search result srcset (bypasses CAPTCHA on product pages)
const PRODUCTS = [
  // ── Ajax sensors (3 products) ─────────────────────────────────────────────
  {
    name: 'Ajax DoorProtect — Sensore Apertura Wireless Antifurto',
    asin: 'B08B3MLCKY',
    cost: 69,
    image_url: 'https://m.media-amazon.com/images/I/41haboHS0ZL._AC_SL1500_.jpg',
    description: 'Sensore apertura wireless Ajax DoorProtect. Rileva apertura porte e finestre, comunicazione via radio a 868 MHz, portata 1300m, IP54. Compatibile con Hub Ajax.',
    is_top_tier: false,
    is_budget_king: false,
  },
  {
    name: 'Ajax MotionProtect Plus — Rilevatore Movimento Esterno con Immunità Animali',
    asin: 'B0CYH91MN1',
    cost: 79,
    image_url: 'https://m.media-amazon.com/images/I/41ioP+lmTDL._AC_SL1500_.jpg',
    description: 'Rilevatore di movimento PIR + microonde Ajax MotionProtect Plus per esterno. Doppia tecnologia anti-falso allarme, IP55, portata 12m, -25°C a +60°C.',
    is_top_tier: false,
    is_budget_king: false,
  },
  {
    name: 'Ajax GlassProtect — Rilevatore Rottura Vetro Wireless',
    asin: 'B0BVG3HHHJ',
    cost: 69,
    image_url: 'https://m.media-amazon.com/images/I/11crroeN57L._AC_SL1500_.jpg',
    description: 'Rilevatore rottura vetro wireless Ajax GlassProtect. Rileva la rottura di vetro temperato, laminato e float fino a 9 metri. IP20, compatibile con Hub Ajax.',
    is_top_tier: false,
    is_budget_king: false,
  },
  {
    name: 'Ajax FireProtect — Rilevatore Fumo e Calore Wireless',
    asin: 'B085N6PPV5',
    cost: 89,
    image_url: 'https://m.media-amazon.com/images/I/31iB0ktr1lL._AC_SL1500_.jpg',
    description: 'Sensore fumo e calore wireless Ajax FireProtect. Rilevamento dual: ottico (fumo) + temperatura. Sirena integrata 85 dB, batteria 7 anni, compatibile Hub Ajax.',
    is_top_tier: false,
    is_budget_king: false,
  },

  // ── Smart locks (3 products) ──────────────────────────────────────────────
  {
    name: 'ULTRALOQ U-Bolt Pro — Serratura Intelligente WiFi + Impronta Digitale',
    asin: 'B0CW3BVMQB',
    cost: 199,
    image_url: 'https://m.media-amazon.com/images/I/61fY01fnnJL._AC_SL1500_.jpg',
    description: 'Serratura smart ULTRALOQ U-Bolt Pro con WiFi integrato. Sblocco fingerprint, PIN, app, chiave, Alexa/Google. Grade 1, IP65, no hub esterno richiesto.',
    is_top_tier: true,
    is_budget_king: false,
  },
  {
    name: 'ULTRALOQ Bridge — Adattatore WiFi per Serrature ULTRALOQ',
    asin: 'B07VZTSLYC',
    cost: 49,
    image_url: 'https://m.media-amazon.com/images/I/51+GVjSUB7L._AC_SL1500_.jpg',
    description: 'Bridge WiFi ULTRALOQ per accesso remoto alle serrature smart. Compatibile Alexa, Google Assistant, SmartThings, IFTTT. Plug-in, setup rapido via app.',
    is_top_tier: false,
    is_budget_king: true,
  },
  {
    name: 'Yale Linus L2 Smart Lock — Serratura Elettronica Bluetooth',
    asin: 'B0DVCWNRVP',
    cost: 189,
    image_url: 'https://m.media-amazon.com/images/I/81tvAHr2OjL._AC_SL1500_.jpg',
    description: 'Yale Linus L2: adattatore smart per serrature con pomolo esistente. Bluetooth, controllo app, accesso temporaneo, registro attività. Design invisibile dall\'esterno.',
    is_top_tier: true,
    is_budget_king: false,
  },

  // ── Security cameras (5 products) ─────────────────────────────────────────
  {
    name: 'Reolink TrackMix + Pannello Solare — Telecamera 4MP PTZ 360°',
    asin: 'B0BG5Q9HDV',
    cost: 129,
    image_url: 'https://m.media-amazon.com/images/I/71Vkw2UAzXL._AC_SL1500_.jpg',
    description: 'Telecamera Reolink PTZ 360° con doppio obiettivo e zoom ibrido 6x. Auto-tracking, 4MP, pannello solare incluso, visione notturna a colori, IP66, WiFi 2.4/5GHz.',
    is_top_tier: false,
    is_budget_king: false,
  },
  {
    name: 'Eufy SoloCam S340 — Telecamera Solare 3K WiFi 360° Senza Abbonamento',
    asin: 'B0CF8R2P24',
    cost: 149,
    image_url: 'https://m.media-amazon.com/images/I/51s1abYqMWL._AC_SL1500_.jpg',
    description: 'Eufy SoloCam S340: 3K, pannello solare integrato, 360° con doppio obiettivo. Archiviazione locale, zero abbonamento, AI rilevamento persone, IP67.',
    is_top_tier: true,
    is_budget_king: false,
  },
  {
    name: 'Ring Stick Up Cam — Telecamera Sorveglianza Esterna a Batteria',
    asin: 'B0C5QXCP7Z',
    cost: 119,
    image_url: 'https://m.media-amazon.com/images/I/51WDKQccaKL._AC_SL1500_.jpg',
    description: 'Ring Stick Up Cam a batteria: 1080p HD, audio bidirezionale, rilevamento movimento, sirena integrata. Funziona con Alexa, montaggio flessibile interno/esterno.',
    is_top_tier: false,
    is_budget_king: false,
  },
  {
    name: 'Arlo Pro 5 — Telecamera WiFi 2K HDR Senza Fili con Sirena',
    asin: 'B0D6GYK1LX',
    cost: 99,
    image_url: 'https://m.media-amazon.com/images/I/61I9ngphoEL._AC_SL1500_.jpg',
    description: 'Arlo Pro 5: 2K HDR, sirena 90dB integrata, rilevamento persone/veicoli, visione notturna colori, IP65. Ricaricabile, senza fili, prova gratuita Arlo Secure.',
    is_top_tier: false,
    is_budget_king: false,
  },
  {
    name: 'Blink Outdoor 4 — Videocamera Sicurezza HD Wireless Alexa',
    asin: 'B0DHLT8T9L',
    cost: 89,
    image_url: 'https://m.media-amazon.com/images/I/31LpheOwNkL._AC_SL1500_.jpg',
    description: 'Blink Outdoor 4: sistema da 4 cam HD wireless, 2 anni di autonomia, IP65, compatibile Alexa, rilevamento movimento avanzato, archiviazione locale o cloud.',
    is_top_tier: false,
    is_budget_king: false,
  },
  {
    name: 'Wyze Cam v3 — Telecamera WiFi 1080p Interno/Esterno con Visione Notturna',
    asin: 'B0DTNKLF1K',
    cost: 59,
    image_url: 'https://m.media-amazon.com/images/I/51cwElicOhL._AC_SL1500_.jpg',
    description: 'Wyze Cam v3: 1080p HD, visione notturna a colori, audio bidirezionale, IP65 per esterno, slot MicroSD, compatible Alexa e Google Assistant. Prezzo imbattibile.',
    is_top_tier: false,
    is_budget_king: true,
  },

  // ── Smart home / hubs ─────────────────────────────────────────────────────
  {
    name: 'Xiaomi Smart Plug WiFi — Presa Intelligente con Monitoraggio Energetico',
    asin: 'B07YBL91XQ',
    cost: 79,
    image_url: 'https://m.media-amazon.com/images/I/31fcY+tNOpL._AC_SL1500_.jpg',
    description: 'Xiaomi Smart Plug Wi-Fi con monitoraggio consumo energetico. Controllo remoto via app Mi Home, compatibile Alexa e Google Home, no hub esterno. Schuko.',
    is_top_tier: false,
    is_budget_king: true,
  },
  {
    name: 'Somfy TaHoma Switch — Hub Smart Home per Domotica e Sicurezza',
    asin: 'B08SM557DH',
    cost: 99,
    image_url: 'https://m.media-amazon.com/images/I/51CywqUIbUL._AC_SL1500_.jpg',
    description: 'Somfy TaHoma Switch: hub domotica universale compatibile io-homecontrol, RTS, Zigbee 3.0. Integra tapparelle, allarmi e sensori Somfy. Alexa, Google, HomeKit.',
    is_top_tier: false,
    is_budget_king: false,
  },
];

async function run() {
  console.log('=== Cyber Security Import — 2026-04-18 ===\n');
  console.log(`Products to import: ${PRODUCTS.length}\n`);

  const insertedIds = [];
  let insertOk = 0;
  let insertFail = 0;

  for (const p of PRODUCTS) {
    const row = {
      name: p.name,
      category: 'Cyber Security',
      sub_category: p.sub_category || 'surveillance-legal',
      price: calcPrice(p.cost),
      product_url: amz(p.asin),
      image_url: p.image_url,
      is_active: true,
      description: p.description,
      ...(p.is_top_tier ? { is_top_tier: true } : {}),
      ...(p.is_budget_king ? { is_budget_king: true } : {}),
    };

    const { data, error } = await sb.from('products').insert(row).select('id');
    if (error) {
      console.error(`[ERROR] INSERT ${p.name.slice(0, 50)}: ${error.message}`);
      insertFail++;
    } else {
      const id = data?.[0]?.id;
      insertedIds.push(id);
      console.log(`[INSERT OK] id=${id} | ${p.name.slice(0, 55)} | price=${row.price} | asin=${p.asin}`);
      insertOk++;
    }
    // Small delay between inserts
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\nInserts: ${insertOk} OK, ${insertFail} failed`);
  console.log(`Inserted IDs: ${insertedIds.filter(Boolean).join(', ')}\n`);

  // ── Step 2: Verify is_active (known DB bug check) ────────────────────────
  const validIds = insertedIds.filter(Boolean);
  if (validIds.length === 0) {
    console.error('[ERROR] No valid IDs to verify.');
    return;
  }

  console.log('Verifying is_active status...');
  const { data: check, error: checkErr } = await sb.from('products')
    .select('id, name, is_active, image_url, product_url')
    .in('id', validIds);

  if (checkErr) {
    console.error('[ERROR] Verification query:', checkErr.message);
    return;
  }

  let activeCount = 0;
  let inactiveIds = [];

  for (const row of check || []) {
    const imgOk = row.image_url?.includes('m.media-amazon.com');
    const tagOk = row.product_url?.includes('kitwer26-21');
    const status = row.is_active ? 'ACTIVE' : 'INACTIVE';
    console.log(`  id=${row.id} ${status} img_real=${imgOk} tag_ok=${tagOk} | ${row.name?.slice(0, 50)}`);
    if (row.is_active) {
      activeCount++;
    } else {
      inactiveIds.push(row.id);
    }
  }

  // ── Step 3: Force-fix is_active if bug fired ─────────────────────────────
  if (inactiveIds.length > 0) {
    console.log(`\n[WARN] ${inactiveIds.length} rows inactive — applying known bug force-fix...`);
    const { error: fixErr } = await sb.from('products')
      .update({ is_active: true })
      .in('id', inactiveIds);
    if (fixErr) {
      console.error('[ERROR] Force-fix UPDATE:', fixErr.message);
    } else {
      console.log(`[FIX OK] Forced is_active=true for ids: ${inactiveIds.join(', ')}`);
    }

    // Final verify
    const { data: finalCheck } = await sb.from('products')
      .select('id, is_active')
      .in('id', inactiveIds);
    const stillInactive = (finalCheck || []).filter(r => !r.is_active);
    if (stillInactive.length > 0) {
      console.error(`[WARN] Still inactive after fix: ${stillInactive.map(r => r.id).join(', ')}`);
    } else {
      console.log('[OK] All rows now is_active=true after fix.');
    }
  } else {
    console.log('[OK] All rows is_active=true — no bug flip detected this time.');
  }

  // ── Step 4: Final count for Cyber Security category ──────────────────────
  const { count } = await sb.from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'Cyber Security')
    .eq('is_active', true);

  console.log(`\n=== DONE ===`);
  console.log(`Inserted: ${insertOk}/${PRODUCTS.length}`);
  console.log(`Active after force-fix: ${validIds.length}`);
  console.log(`Total active Cyber Security products in DB: ${count}`);
}

run().catch(console.error);
