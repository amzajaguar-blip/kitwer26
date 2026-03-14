/**
 * reclassify-unsorted.mjs
 *
 * Legge tutti i prodotti con category = 'UNSORTED' e tenta di riassegnarli
 * tramite lo stesso keyword matching usato in auto-importer.ts.
 *
 * Run (dry-run, mostra cosa cambierebbe):
 *   node scripts/reclassify-unsorted.mjs
 *
 * Run (applica effettivamente gli aggiornamenti):
 *   node scripts/reclassify-unsorted.mjs --apply
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Credenziali Supabase non trovate nel .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DRY_RUN  = !process.argv.includes('--apply');

// ──────────────────────────────────────────────
// CATEGORY MAP — speculare ad auto-importer.ts
// ──────────────────────────────────────────────
const CATEGORY_MAP = {
  // hardware-crypto-wallets
  'ledger':              'hardware-crypto-wallets',
  'trezor':              'hardware-crypto-wallets',
  'tangem':              'hardware-crypto-wallets',
  'cold storage':        'hardware-crypto-wallets',
  'signing device':      'hardware-crypto-wallets',
  'signing':             'hardware-crypto-wallets',
  'mnemonic':            'hardware-crypto-wallets',
  'cryptosteel':         'hardware-crypto-wallets',
  'cobo':                'hardware-crypto-wallets',
  'bitcoin':             'hardware-crypto-wallets',
  'crypto':              'hardware-crypto-wallets',
  'wallet':              'hardware-crypto-wallets',
  'seed':                'hardware-crypto-wallets',
  // tactical-power-grid
  'portable power station': 'tactical-power-grid',
  'power station':       'tactical-power-grid',
  'portable power':      'tactical-power-grid',
  'goal zero':           'tactical-power-grid',
  'power bank':          'tactical-power-grid',
  'fast charge':         'tactical-power-grid',
  'apc':                 'tactical-power-grid',
  'ups':                 'tactical-power-grid',
  'powerbank':           'tactical-power-grid',
  'bluetti':             'tactical-power-grid',
  'jackery':             'tactical-power-grid',
  'ecoflow':             'tactical-power-grid',
  'anker':               'tactical-power-grid',
  'nitecore':            'tactical-power-grid',
  'marbero':             'tactical-power-grid',
  'oukitel':             'tactical-power-grid',
  'powertraveller':      'tactical-power-grid',
  'dji':                 'tactical-power-grid',
  'batteria':            'tactical-power-grid',
  'battery':             'tactical-power-grid',
  'solare':              'tactical-power-grid',
  'solar':               'tactical-power-grid',
  'charger':             'tactical-power-grid',
  'caricatore':          'tactical-power-grid',
  // comms-security-shield
  'privacy screen':      'comms-security-shield',
  'privacy filter':      'comms-security-shield',
  'security key':        'comms-security-shield',
  'anti-glare':          'comms-security-shield',
  'antiglare':           'comms-security-shield',
  'yubikey':             'comms-security-shield',
  'yubico':              'comms-security-shield',
  'faraday':             'comms-security-shield',
  'airtag':              'comms-security-shield',
  'rfid':                'comms-security-shield',
  'privacy':             'comms-security-shield',
  'screen':              'comms-security-shield',
  'fido':                'comms-security-shield',
  'titan':               'comms-security-shield',
  'thetis':              'comms-security-shield',
  'feitian':             'comms-security-shield',
  // sim-racing-accessories-premium
  'wheel stand':         'sim-racing-accessories-premium',
  'driving force':       'sim-racing-accessories-premium',
  'cockpit':             'sim-racing-accessories-premium',
  'playseat':            'sim-racing-accessories-premium',
  'racing':              'sim-racing-accessories-premium',
  'shifter':             'sim-racing-accessories-premium',
  'volante':             'sim-racing-accessories-premium',
  'sim':                 'sim-racing-accessories-premium',
  'moza':                'sim-racing-accessories-premium',
  'fanatec':             'sim-racing-accessories-premium',
  'thrustmaster':        'sim-racing-accessories-premium',
  'openwheeler':         'sim-racing-accessories-premium',
  'wheel':               'sim-racing-accessories-premium',
  'pedals':              'sim-racing-accessories-premium',
  'logitech':            'sim-racing-accessories-premium',
  'next level':          'sim-racing-accessories-premium',
  'gt omega':            'sim-racing-accessories-premium',
  'playseat challenge':  'sim-racing-accessories-premium',
  'playseat trophy':     'sim-racing-accessories-premium',
  // trading-gaming-desk-accessories-premium
  'monitor arm':         'trading-gaming-desk-accessories-premium',
  'monitor mount':       'trading-gaming-desk-accessories-premium',
  'gaming chair':        'trading-gaming-desk-accessories-premium',
  'huanuo':              'trading-gaming-desk-accessories-premium',
  'bontec':              'trading-gaming-desk-accessories-premium',
  'chair':               'trading-gaming-desk-accessories-premium',
  'sedia':               'trading-gaming-desk-accessories-premium',
  'ergonomic':           'trading-gaming-desk-accessories-premium',
  'monitor':             'trading-gaming-desk-accessories-premium',
  'mount':               'trading-gaming-desk-accessories-premium',
  'desk':                'trading-gaming-desk-accessories-premium',
  'braccio':             'trading-gaming-desk-accessories-premium',
  'vivo':                'trading-gaming-desk-accessories-premium',
  'vr':                  'trading-gaming-desk-accessories-premium',
  'quest':               'trading-gaming-desk-accessories-premium',
  'pimax':               'trading-gaming-desk-accessories-premium',
  'valve index':         'trading-gaming-desk-accessories-premium',
  'ergotron':            'trading-gaming-desk-accessories-premium',
  'wali':                'trading-gaming-desk-accessories-premium',
  'ultrarm':             'trading-gaming-desk-accessories-premium',
  'odk':                 'trading-gaming-desk-accessories-premium',
  // survival-edc-tech
  'credit card survival': 'survival-edc-tech',
  'fire starter':        'survival-edc-tech',
  'ferro rod':           'survival-edc-tech',
  'arc lighter':         'survival-edc-tech',
  'water filter':        'survival-edc-tech',
  'multi-tool':          'survival-edc-tech',
  'penna tattica':       'survival-edc-tech',
  'edc':                 'survival-edc-tech',
  'keychain':            'survival-edc-tech',
  'baton':               'survival-edc-tech',
  'olight':              'survival-edc-tech',
  'survival':            'survival-edc-tech',
  'leatherman':          'survival-edc-tech',
  'victorinox':          'survival-edc-tech',
  'gerber':              'survival-edc-tech',
  'streamlight':         'survival-edc-tech',
  'sog':                 'survival-edc-tech',
  'lifestraw':           'survival-edc-tech',
  'paracord':            'survival-edc-tech',
  'tattica':             'survival-edc-tech',
  'accendino':           'survival-edc-tech',
  'emergenza':           'survival-edc-tech',
  'emergency':           'survival-edc-tech',
  'mylar':               'survival-edc-tech',
  'impronta':            'survival-edc-tech',
  'flashlight':          'survival-edc-tech',
  'torcia':              'survival-edc-tech',
  'multitool':           'survival-edc-tech',
  'fingerprint':         'survival-edc-tech',
};

function classifyByName(name) {
  const lower = name.toLowerCase();
  for (const [keyword, cat] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return cat;
  }
  return null; // nessun match
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
console.log(`\n${DRY_RUN ? '🔍 DRY-RUN (nessuna modifica)' : '✏️  APPLY MODE — aggiornamento effettivo'}\n`);

// Fetch con paginazione (Supabase restituisce max 1000 righe per richiesta)
let allProducts = [];
let from = 0;
const PAGE = 1000;

while (true) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('category', 'UNSORTED')
    .range(from, from + PAGE - 1);

  if (error) {
    console.error('Errore fetch:', error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) break;
  allProducts = allProducts.concat(data);
  if (data.length < PAGE) break;
  from += PAGE;
}

console.log(`Prodotti UNSORTED trovati: ${allProducts.length}\n`);

if (allProducts.length === 0) {
  console.log('Nessun prodotto UNSORTED da reclassificare.');
  process.exit(0);
}

// Classifica
const toUpdate = [];
const stillUnsorted = [];

for (const p of allProducts) {
  const cat = classifyByName(p.name);
  if (cat) {
    toUpdate.push({ id: p.id, name: p.name, category: cat });
  } else {
    stillUnsorted.push(p.name);
  }
}

console.log(`✓ Reclassificabili : ${toUpdate.length}`);
console.log(`✗ Ancora UNSORTED  : ${stillUnsorted.length}\n`);

// Riepilogo per categoria
const byCat = {};
for (const p of toUpdate) {
  byCat[p.category] = (byCat[p.category] || 0) + 1;
}
if (toUpdate.length > 0) {
  console.log('Distribuzione nuove categorie:');
  for (const [cat, n] of Object.entries(byCat)) {
    console.log(`  ${cat}: ${n}`);
  }
  console.log('');
}

// Mostra i nomi rimasti UNSORTED
if (stillUnsorted.length > 0) {
  console.log('Prodotti che restano UNSORTED:');
  stillUnsorted.forEach(n => console.log(`  - ${n}`));
  console.log('');
}

if (DRY_RUN) {
  console.log('👉 Aggiungi --apply per applicare le modifiche.\n');
  process.exit(0);
}

// ── APPLY ──────────────────────────────────────
let updated = 0;
let failed  = 0;

for (const p of toUpdate) {
  const { error } = await supabase
    .from('products')
    .update({ category: p.category })
    .eq('id', p.id);

  if (error) {
    console.error(`  FAIL [${p.id}] "${p.name}": ${error.message}`);
    failed++;
  } else {
    console.log(`  OK  [${p.id}] "${p.name}" → ${p.category}`);
    updated++;
  }
}

console.log(`\n✅ Aggiornati: ${updated}  ❌ Falliti: ${failed}\n`);
