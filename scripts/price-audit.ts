#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eq = line.indexOf('='); if (eq === -1) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k) process.env[k] = v;
    }
  } catch { /* ignore */ }
}
loadEnv();

function commercialRound(value: number): number {
  const floor = Math.floor(value);
  if (floor + 0.90 >= value) return floor + 0.90;
  if (floor + 0.99 >= value) return floor + 0.99;
  return (floor + 1) + 0.90;
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Prodotti con prezzo Amazon noto dai CSV MAGAZZINO/
const REFS = [
  { name: 'MOZA R3 Wheel Base',         amazonBase: 249.00,  search: 'MOZA R3' },
  { name: 'MOZA ES Lite Steering Wheel', amazonBase: 189.00,  search: 'MOZA ES Lite' },
  { name: 'Logitech G29',               amazonBase: 299.99,  search: 'Logitech G29' },
  { name: 'Thrustmaster T300RS',         amazonBase: 399.00,  search: 'Thrustmaster T300RS' },
  { name: 'BetaFPV Cetus BNF',          amazonBase: 129.00,  search: 'BetaFPV Cetus' },
  { name: 'EMAX Tinyhawk III BNF',       amazonBase: 149.00,  search: 'EMAX Tinyhawk III' },
  { name: 'EMAX Tinyhawk Freestyle BNF', amazonBase: 159.99,  search: 'EMAX Tinyhawk Freestyle' },
  { name: 'Ledger Nano X',              amazonBase: 149.00,  search: 'Ledger Nano X' },
  { name: 'Ledger Nano S Plus',         amazonBase: 79.00,   search: 'Ledger Nano S Plus' },
  { name: 'Trezor Model One',           amazonBase: 59.00,   search: 'Trezor Model One' },
];

async function main() {
  console.log('');
  console.log('TABELLA AUDIT PREZZI — KITWER26');
  console.log('Formula corretta: commercialRound(amazonBase × 1.20)');
  console.log('='.repeat(105));
  const header = [
    'St',
    'Prodotto'.padEnd(32),
    'Amazon'.padStart(8),
    'Target×1.20'.padStart(12),
    'DB Attuale'.padStart(11),
    'Δ'.padStart(7),
    'Margin%'.padStart(8),
    'OK?'.padStart(5),
  ].join(' ');
  console.log(header);
  console.log('-'.repeat(105));

  let allOk = true;

  for (const ref of REFS) {
    const { data } = await sb
      .from('products')
      .select('name, price')
      .ilike('name', `%${ref.search}%`)
      .gt('price', 0)
      .limit(1);

    const dbPrice = data?.[0]?.price ?? null;
    const target  = commercialRound(ref.amazonBase * 1.20);
    const delta   = dbPrice != null ? dbPrice - target : null;
    const margin  = dbPrice != null
      ? ((dbPrice - ref.amazonBase) / ref.amazonBase * 100).toFixed(1)
      : 'N/A';
    const marginOk = dbPrice != null && (dbPrice >= ref.amazonBase * 1.20 - 0.01);
    const status  = dbPrice == null ? '❓' : marginOk ? '✅' : '❌';

    if (!marginOk && dbPrice != null) allOk = false;

    console.log([
      status,
      ref.name.padEnd(32),
      ('€' + ref.amazonBase.toFixed(2)).padStart(8),
      ('€' + target.toFixed(2)).padStart(12),
      (dbPrice != null ? '€' + dbPrice.toFixed(2) : 'NOT FOUND').padStart(11),
      (delta != null ? (delta >= 0 ? '+' : '') + delta.toFixed(2) : 'N/A').padStart(7),
      (margin + '%').padStart(8),
      marginOk ? 'OK' : dbPrice == null ? '???' : 'FAIL',
    ].join(' '));
  }

  console.log('='.repeat(105));
  console.log('');
  console.log(`FORMULA: commercialRound(base × 1.20) — Esempio: €249 → commercialRound(298.80) = €298.90`);
  console.log(`RISULTATO: ${allOk ? '✅ Tutti i prezzi sono >= 20% margine' : '❌ Alcuni prezzi sotto il 20% — FIX necessario'}`);
  console.log('');
}

main().catch(e => { console.error(e); process.exit(1); });
