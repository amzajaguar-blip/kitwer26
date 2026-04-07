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
  anomaliesDeleted:    number;
  faradayMoved:        number;
  generalNulled:       number;
  survivalDeactivated: number;
}

function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error(`${C.red}${C.bright}[FATAL]${C.reset} Env vars mancanti in .env.local`);
    process.exit(1);
  }
  return createClient(url, key);
}

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
      const ids = scooters!.map((p: { id: string }) => p.id);
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
      const ids = watches!.map((p: { id: string }) => p.id);
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
      const ids = drones!.map((p: { id: string }) => p.id);
      await sb.from('products').delete().in('id', ids);
      stats.anomaliesDeleted += ids.length;
    }
  }

  log(C.green, 'STEP-1', `Anomalie rimosse: ${DRY_RUN ? '[DRY-RUN]' : stats.anomaliesDeleted}`);
}

// ── STEP 2: Fix Faraday — sposta da crypto-wallets → Smart Security ──────────
async function step2_faradayFix(sb: SupabaseClient, stats: SurgeryStats) {
  log(C.cyan, 'STEP-2', 'Fix prodotti Faraday mal categorizzati...');

  const { data: faraday, error } = await sb
    .from('products')
    .select('id, name, sub_category')
    .eq('category', 'hardware-crypto-wallets')
    .or('name.ilike.%faraday%,description.ilike.%faraday bag%,description.ilike.%signal block%');
  if (error) { log(C.red, 'ERR', error.message); return; }

  log(C.yellow, 'FARADAY', `Trovati ${faraday?.length ?? 0} prodotti Faraday in Crypto Wallets`);
  for (const p of faraday ?? []) log(C.gray, 'MOVE', `  → ${p.id} | ${p.name} [${p.sub_category}]`);

  if (!DRY_RUN && (faraday?.length ?? 0) > 0) {
    const ids = faraday!.map((p: { id: string }) => p.id);
    const { error: upErr } = await sb
      .from('products')
      .update({ category: 'Smart Security', sub_category: 'rfid-protection' })
      .in('id', ids);
    if (upErr) log(C.red, 'ERR', upErr.message);
    else stats.faradayMoved += ids.length;
  }

  log(C.green, 'STEP-2', `Faraday spostati: ${DRY_RUN ? '[DRY-RUN]' : stats.faradayMoved}`);
}

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
    const ids = generals!.map((p: { id: string }) => p.id);
    const { error: upErr } = await sb
      .from('products')
      .update({ sub_category: null })
      .in('id', ids);
    if (upErr) log(C.red, 'ERR', upErr.message);
    else stats.generalNulled += ids.length;
  }

  log(C.green, 'STEP-3', `General nullati: ${DRY_RUN ? '[DRY-RUN]' : stats.generalNulled}`);
}

// ── STEP 4: Nascondi tutti survival-edc-tech (price = 0, esclusi da fetchProducts) ─
// Nota: il DB non ha colonna is_active. fetchProducts filtra .gt('price', 0),
// quindi price=0 equivale a nascondere il prodotto dal frontend.
// Ripristino: re-importare da CSV.
async function step4_survivalDeactivate(sb: SupabaseClient, stats: SurgeryStats) {
  log(C.cyan, 'STEP-4', 'Nascondendo prodotti survival-edc-tech (price → 0)...');

  const { data: toHide, error: cntErr } = await sb
    .from('products')
    .select('id')
    .eq('category', 'survival-edc-tech')
    .gt('price', 0);
  if (cntErr) { log(C.red, 'ERR', cntErr.message); return; }

  const count = toHide?.length ?? 0;
  log(C.yellow, 'SURVIVAL', `Prodotti visibili da nascondere: ${count}`);

  if (!DRY_RUN && count > 0) {
    const ids = toHide!.map((p: { id: string | number }) => p.id);
    const { error: upErr } = await sb
      .from('products')
      .update({ price: 0 })
      .in('id', ids);
    if (upErr) log(C.red, 'ERR', upErr.message);
    else stats.survivalDeactivated = count;
  }

  log(C.green, 'STEP-4', `Nascosti: ${DRY_RUN ? '[DRY-RUN]' : stats.survivalDeactivated}`);
}

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
