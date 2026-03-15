/**
 * ASSIGN-SUBCATEGORIES
 *
 * 1) Aggiunge la colonna sub_category (TEXT, nullable) alla tabella products (se non esiste)
 * 2) Analizza name + description di ogni prodotto e assegna la sub_category corretta
 * 3) Aggiorna il DB con i valori assegnati
 *
 * Run:  npx tsx scripts/assign-subcategories.ts
 *       npx tsx scripts/assign-subcategories.ts --dry-run   ← solo stampa, non scrive
 *
 * Richiede in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Colori terminale ──────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bright:  '\x1b[1m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  gray:    '\x1b[90m',
  magenta: '\x1b[35m',
};
function log(color: string, tag: string, msg: string) {
  const ts = new Date().toLocaleTimeString('it-IT');
  console.log(`${C.gray}${ts}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);
}

// ── Carica .env.local ─────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  try {
    const text = readFileSync(envPath, 'utf-8');
    for (const line of text.split('\n')) {
      const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // noop — ci fidiamo delle env già impostate
  }
}
loadEnv();

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const DRY_RUN  = process.argv.includes('--dry-run');

// ── Mappa keyword → sub_category per ogni macro-categoria ────────────────────
//    Le chiavi delle keyword vengono testate in lowercase sul testo del prodotto.
//    L'ORDINE conta: la prima corrispondenza vince.
const SUB_KW: Record<string, Array<[string, string[]]>> = {
  'hardware-crypto-wallets': [
    ['air-gapped',  ['keystone', 'ellipal', 'ngrave', 'passport', 'air-gapped', 'air gapped', 'qr code', 'qr-code', 'seedsigner']],
    ['backup-seed', ['cryptosteel', 'bilodeau', 'stamp seed', 'seed steel', 'seed backup', 'metal backup', 'steel wallet', 'seed capsule', 'mnemonic steel', 'hodlr', 'cobo tablet']],
    ['premium',     ['stax', 'safe 5', 'touch', 'flex', 'coldcard mk', 'bitbox02', 'jade', 'keystone pro', 'model t', 'shamir', 'cobo vault pro']],
    ['entry-level', ['nano s', 'nano x', 'safe 3', 'tangem', 'model one', 'one model', 'foundation passport', 'keepkey', 'onekey mini', 'coldcard mk3']],
    ['backup-seed', ['seed', 'mnemonic', 'backup phrase', 'recovery phrase', 'steel plate']],
    ['entry-level', ['ledger', 'trezor', 'tangem', 'wallet']],          // fallback crypto
  ],

  'comms-security-shield': [
    ['security-keys',   ['yubikey', 'yubico', 'security key', 'fido2', 'fido ', 'u2f', 'solokey', 'passkey', 'titan key', 'nitrokey']],
    ['rfid-protection', ['rfid', 'nfc block', 'faraday', 'signal block', 'emf', 'cage', 'shield bag', 'signal jammer']],
    ['privacy-screen',  ['privacy screen', 'privacy filter', 'monitor filter', 'screen filter', 'schermo privacy', 'blickschutz', 'privacy protector', 'anti-spy']],
    ['encrypted-comms', ['vpn', 'encrypted', 'privacy router', 'gl.inet', 'gl-inet', 'openwrt', 'protonmail', 'secure phone', 'tor router']],
    ['rfid-protection', ['rfid', 'nfc', 'protez']],                     // fallback
    ['privacy-screen',  ['screen', 'schermo', 'monitor']],              // fallback
    ['security-keys',   ['chiave', 'authenticat', 'otp', '2fa']],       // fallback
  ],

  'survival-edc-tech': [
    ['water-filter',    ['lifestraw', 'sawyer', 'berkey', 'water filter', 'filtro acqua', 'water purif', 'purification tablet', 'katadyn']],
    ['medical-kit',     ['first aid', 'ifak', 'tourniquet', 'trauma kit', 'bandage', 'kit pronto soccorso', 'medical kit', 'chest seal', 'hemostatic']],
    ['navigation',      ['compass', 'bussola', 'gps track', 'garmin inreach', 'orienteering', 'navigation']],
    ['cordage-shelter', ['paracord', 'para-cord', ' tarp', 'hammock', 'bivouac', 'bivy bag', 'shelter', 'tenda', 'poncho', 'emergency blanket']],
    ['multitools',      ['multitool', 'multi-tool', 'leatherman', 'victorinox', 'swiss army', 'gerber', 'benchmade', 'sog ', 'wave ', 'charge tti']],
    ['flashlights',     ['flashlight', 'torch', 'lumen', 'torcia', 'fenix', 'olight', 'nitecore', 'streamlight', 'headlamp', 'headlight', 'tactical light', 'led light']],
    ['navigation',      ['gps', 'compass', 'map']],                     // fallback
    ['flashlights',     ['light', 'lamp', 'luce']],                     // fallback
    ['multitools',      ['knife', 'coltello', 'blade', 'tool', 'edc']], // fallback
  ],

  'tactical-power-grid': [
    ['solar-panels',    ['solar panel', 'pannello solare', 'fotovoltaic', 'solar charge', 'monocrystalline', 'solar generator', 'foldable solar']],
    ['batteries',       ['18650', 'lithium battery', 'lipo', 'lifepo4', 'rechargeable batter', 'cell battery', 'batterie ricaric', 'nimh', 'button cell']],
    ['power-stations',  ['power station', 'jackery', 'ecoflow', 'bluetti', 'goal zero', 'generac', 'powerstation', 'portable generator', 'station explorer', 'river max', 'delta pro']],
    ['power-banks',     ['power bank', 'powerbank', 'portable charge', 'anker', 'baseus', 'caricatore portatile', 'batteria esterna', 'external battery']],
    ['solar-panels',    ['solar', 'pannello']],                         // fallback
    ['batteries',       ['batteria', 'battery', 'pile']],               // fallback
    ['power-stations',  ['station', 'generatore', 'generator']],        // fallback
    ['power-banks',     ['bank', 'caricatore', 'charger', 'ups']],      // fallback
  ],

  'sim-racing-accessories-premium': [
    ['handbrakes',      ['handbrake', 'freno a mano', 'e-brake', 'drift brake', 'hydraulic handbrake']],
    ['shifters',        ['shifter', 'sequential', 'h-pattern', 'gearbox', 'cambio sequenziale', 'h shifter']],
    ['pedals',          ['pedal', 'pedaliera', 'heusinkveld', 'brake pedal', 'load cell', 'clutch pedal', 'sprint pedals', 'invicta pedals']],
    ['cockpit-rigs',    ['cockpit', 'racing rig', 'playseat', 'next level racing', 'gt omega', 'rseat', 'chassis', 'profile frame', 'aluminum profile']],
    ['steering-wheels', ['steering wheel', 'volante', 'fanatec', 'thrustmaster', 'logitech g', 'moza r', 'simagic', 'direct drive', 'wheel base', 'servo base', 'dd pro', 'csl dd', 'gt dd']],
  ],

  'sim-racing': [
    ['handbrakes',      ['handbrake', 'freno a mano', 'e-brake', 'drift brake']],
    ['shifters',        ['shifter', 'sequential', 'h-pattern', 'gearbox', 'cambio']],
    ['pedals',          ['pedal', 'pedaliera', 'heusinkveld', 'brake', 'load cell', 'clutch']],
    ['cockpit-rigs',    ['cockpit', 'rig', 'playseat', 'next level', 'chassis', 'frame', 'aluminum']],
    ['steering-wheels', ['steering', 'volante', 'fanatec', 'thrustmaster', 'logitech g', 'moza', 'simagic', 'direct drive', 'wheel']],
  ],

  'trading-gaming-desk-accessories-premium': [
    ['vr-headsets',     ['virtual reality', 'oculus', 'meta quest', 'pico ', 'valve index', 'htc vive', 'vr headset', 'mixed reality']],
    ['cooling-pads',    ['cooling pad', 'laptop cooler', 'notebook cooler', 'pad raffreddamento', 'laptop stand fan']],
    ['monitor-arms',    ['monitor arm', 'braccio monitor', 'supporto monitor', 'vesa mount', 'dual monitor arm', 'single monitor arm', 'monitor riser', 'monitor stand']],
    ['gaming-chairs',   ['gaming chair', 'secretlab', 'noblechairs', 'dxracer', 'racing chair', 'sedia gaming', 'office chair', 'ergonomic chair', 'chair']],
    ['desk-accessories',['desk mat', 'tappetino scrivania', 'cable management', 'monitor light', 'screen bar', 'key light', 'laptop arm', 'keyboard tray', 'webcam mount']],
    ['vr-headsets',     ['vr ', 'quest', 'headset']],                   // fallback
    ['cooling-pads',    ['cooling', 'raffreddamento']],                  // fallback
    ['monitor-arms',    ['arm', 'braccio', 'supporto']],                 // fallback
    ['desk-accessories',['desk', 'scrivania', 'organizer']],             // fallback
  ],

  'pc-hardware-high-ticket': [
    ['cpu-cooling',     ['aio cooler', 'liquid cooling', 'water cooler', 'noctua nh', 'be quiet', 'arctic liquid', 'radiator', '360mm', '240mm', 'all-in-one cooler', 'cpu cooler']],
    ['gpus',            ['rtx 4', 'rtx 3', 'rx 7', 'rx 6', 'radeon rx', 'geforce rtx', 'geforce gtx', 'graphics card', 'scheda video', 'gpu', 'nvidia', 'amd gpu']],
    ['cpus',            ['ryzen 7', 'ryzen 9', 'ryzen 5', 'core i9', 'core i7', 'core i5', 'threadripper', 'cpu', 'processore', 'amd am5', 'intel lga']],
    ['memory',          ['ddr5', 'ddr4', ' ram ', 'memory kit', 'memoria ram', 'corsair vengeance', 'g.skill trident', 'crucial ballistix', 'kingston fury']],
    ['storage',         ['nvme', 'm.2 ssd', 'pcie ssd', 'samsung 970', 'samsung 980', 'samsung 990', 'wd black', 'seagate barracuda', 'hard drive', 'hdd', 'storage ssd']],
    ['cpu-cooling',     ['cooler', 'cooling', 'heatsink', 'fan']],       // fallback
    ['gpus',            ['gpu', 'video card', 'display card']],          // fallback
    ['cpus',            ['processor', 'processore', 'cpu']],             // fallback
    ['memory',          ['ram', 'dram', 'memory']],                      // fallback
    ['storage',         ['ssd', 'nvme', 'drive', 'storage']],            // fallback
  ],

  'sicurezza-domotica-high-end': [
    ['home-automation', ['home assistant', 'zigbee', 'z-wave', 'hub', 'bridge', 'philips hue', 'smart plug', 'smart switch', 'automation', 'matter ', 'thread ', 'alexa hub']],
    ['alarm-systems',   ['alarm', 'sirena', 'motion sensor', 'detector', 'pir sensor', 'sensore movimento', 'glass break', 'sistema allarme', 'burglar alarm', 'contact sensor']],
    ['smart-locks',     ['smart lock', 'serratura smart', 'deadbolt', 'august smart', 'yale assure', 'schlage', 'nuki', 'electronic lock', 'keypad lock', 'fingerprint lock']],
    ['smart-cameras',   ['security camera', 'cctv', 'ip camera', 'doorbell cam', 'video doorbell', 'arlo pro', 'ring cam', 'eufy cam', 'hikvision', 'dahua', 'reolink', 'baby monitor']],
    ['home-automation', ['smart home', 'domotica', 'zigbee', 'automation']],  // fallback
    ['alarm-systems',   ['alarm', 'sensore', 'detector', 'sirena']],           // fallback
    ['smart-locks',     ['lock', 'serratura', 'chiave smart']],                // fallback
    ['smart-cameras',   ['camera', 'telecamera', 'webcam', 'sorveglianza']],   // fallback
  ],
};

// Alias: le categorie con nomi alternativi puntano alla stessa mappa
SUB_KW['Tactical Power']  = SUB_KW['tactical-power-grid'];
SUB_KW['PC Hardware']     = SUB_KW['pc-hardware-high-ticket'];
SUB_KW['Smart Security']  = SUB_KW['sicurezza-domotica-high-end'];

// ── Funzione di classificazione ───────────────────────────────────────────────
function assignSubCategory(
  category: string,
  name: string,
  description: string,
): string | null {
  const rules = SUB_KW[category];
  if (!rules) return null;

  const text = `${name} ${description ?? ''}`.toLowerCase();
  for (const [subCat, keywords] of rules) {
    for (const kw of keywords) {
      if (text.includes(kw)) return subCat;
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) log(C.yellow, 'DRY-RUN', 'Nessuna scrittura sul DB — solo simulazione');

  // 1. Verifica/aggiungi colonna sub_category
  log(C.cyan, 'MIGRATE', 'Verifica colonna sub_category...');

  // Tenta un SELECT per capire se la colonna esiste già
  const { error: colCheckErr } = await supabase
    .from('products')
    .select('sub_category')
    .limit(1);

  if (colCheckErr && colCheckErr.message.includes('sub_category does not exist')) {
    log(C.yellow, 'MIGRATE', 'Colonna sub_category non trovata. Aggiunta in corso...');
    // Prova con exec_sql se disponibile
    const { error: rpcErr } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;`,
    });
    if (rpcErr) {
      console.log('\n' + C.yellow + C.bright + '══════════════════════════════════════════════════════' + C.reset);
      console.log(C.bright + '  Esegui questa query nel Supabase SQL Editor:' + C.reset);
      console.log(C.cyan + '\n  ALTER TABLE products ADD COLUMN IF NOT EXISTS sub_category TEXT;\n' + C.reset);
      console.log(C.yellow + C.bright + '══════════════════════════════════════════════════════' + C.reset + '\n');
      console.log('  Poi riesegui: npx tsx scripts/assign-subcategories.ts\n');
      process.exit(0);
    }
    log(C.green, 'MIGRATE', 'Colonna sub_category aggiunta');
  } else {
    log(C.green, 'MIGRATE', 'Colonna sub_category già presente');
  }

  // 2. Recupera tutti i prodotti
  log(C.cyan, 'FETCH', 'Recupero tutti i prodotti...');
  let allProducts: { id: string; name: string; category: string | null; description: string | null }[] = [];
  let from = 0;
  const CHUNK = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, description')
      .range(from, from + CHUNK - 1);

    if (error) {
      console.error('❌  Errore fetch prodotti:', error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allProducts = allProducts.concat(data);
    if (data.length < CHUNK) break;
    from += CHUNK;
  }

  log(C.cyan, 'FETCH', `Trovati ${allProducts.length} prodotti totali`);

  // 3. Calcola sub_category per ciascun prodotto
  const updates: { id: string; sub_category: string }[] = [];
  const stats: Record<string, number> = {};
  let skipped = 0;

  for (const p of allProducts) {
    const cat = p.category ?? '';
    const sub = assignSubCategory(cat, p.name ?? '', p.description ?? '');
    if (sub) {
      updates.push({ id: p.id, sub_category: sub });
      stats[`${cat} → ${sub}`] = (stats[`${cat} → ${sub}`] ?? 0) + 1;
    } else {
      skipped++;
    }
  }

  log(C.cyan, 'CLASSIFY', `Assegnate: ${updates.length}  |  Senza match: ${skipped}`);

  // 4. Scrivi aggiornamenti in batch
  if (!DRY_RUN && updates.length > 0) {
    log(C.cyan, 'UPDATE', `Aggiornamento ${updates.length} prodotti in batch da 200...`);
    const BATCH = 200;
    let done = 0;
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = updates.slice(i, i + BATCH);
      const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
      if (error) {
        console.error(`❌  Errore upsert batch ${i / BATCH + 1}:`, error.message);
      } else {
        done += batch.length;
      }
    }
    log(C.green, 'UPDATE', `${done} prodotti aggiornati sul DB`);
  }

  // 5. Riepilogo statistiche
  console.log('\n' + C.bright + '─── Riepilogo sub_category assegnate ───' + C.reset);
  const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sorted) {
    console.log(`  ${C.cyan}${count.toString().padStart(4)}${C.reset}  ${key}`);
  }
  console.log(`  ${C.yellow}${skipped.toString().padStart(4)}${C.reset}  senza sub_category`);
  console.log();

  if (DRY_RUN) {
    log(C.yellow, 'DRY-RUN', 'Fine simulazione — nessuna modifica al DB');
  } else {
    log(C.green, 'DONE', 'Tutte le sub_category sono state assegnate!');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
