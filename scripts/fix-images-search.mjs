/**
 * FIX-IMAGES-SEARCH — Cerca ogni prodotto su Amazon.it per nome
 * ed estrae l'immagine reale dal primo risultato.
 *
 * Run: node scripts/fix-images-search.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Carica .env.local ─────────────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      const val = line.slice(eqIdx + 1).trim();
      if (key) process.env[key] = val;
    }
  } catch { /* ignore */ }
}
loadEnv();

const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m',
  yellow: '\x1b[33m', red: '\x1b[31m', gray: '\x1b[90m',
};
const log = (color, tag, msg) =>
  console.log(`${C.gray}${new Date().toLocaleTimeString('it-IT')}${C.reset} ${color}${C.bright}[${tag}]${C.reset} ${msg}`);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
);

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];
let uaIdx = 0;
const nextUA = () => USER_AGENTS[uaIdx++ % USER_AGENTS.length];

function delay(min = 2000, max = 4000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  log(C.yellow, 'WAIT', `Attendo ${(ms / 1000).toFixed(1)}s...`);
  return new Promise(r => setTimeout(r, ms));
}

function isAsinUrl(url) {
  return /\/images\/I\/[A-Z0-9]{10}\.jpg$/i.test(url);
}

async function searchAmazonImage(productName) {
  const q = encodeURIComponent(productName);
  const url = `https://www.amazon.it/s?k=${q}&language=it_IT`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': nextUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      log(C.yellow, 'HTTP', `Amazon search risponde ${res.status}`);
      return null;
    }

    const html = await res.text();

    if (html.toLowerCase().includes('captcha') || html.includes('Type the characters')) {
      log(C.yellow, 'CAPTCHA', 'Amazon ha mostrato CAPTCHA — attendere di più tra le richieste');
      return null;
    }

    // Estrai immagini dai srcset delle product card
    const srcsets = [...html.matchAll(/srcset="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g)];
    if (srcsets.length > 0) {
      // Prendi la prima URL dal srcset (la 1x, prima dello spazio)
      const firstUrl = srcsets[0][1].split(' ')[0];
      // Converti in alta risoluzione sostituendo il suffix
      const hiRes = firstUrl.replace(/\._AC_UL\d+_(?:QL\d+_)?\.jpg$/, '._AC_SL500_.jpg')
                             .replace(/\._[^.]+\.jpg$/, '._AC_SL500_.jpg');
      return hiRes;
    }

    // Fallback: cerca pattern immagine generica
    const fallback = html.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%+]{12,}\._[^ "]+\.jpg/);
    if (fallback) return fallback[0].split(' ')[0];

    log(C.yellow, 'IMG', 'Nessuna immagine trovata nei risultati');
    return null;

  } catch (err) {
    log(C.red, 'ERROR', `Fetch fallita: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log(`\n${C.bright}${C.cyan}${'━'.repeat(58)}${C.reset}`);
  console.log(`${C.bright}${C.cyan}   FIX-IMAGES-SEARCH — Cerca immagini reali su Amazon${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'━'.repeat(58)}${C.reset}\n`);

  const { data, error } = await supabase
    .from('products')
    .select('id, name, image_url');

  if (error) throw new Error(`Supabase: ${error.message}`);

  const broken = (data ?? []).filter(p => !p.image_url || isAsinUrl(p.image_url));
  log(C.cyan, 'SCAN', `${broken.length} prodotti con immagine da aggiornare (su ${data.length} totali)\n`);

  if (broken.length === 0) {
    log(C.green, 'OK', 'Tutte le immagini sono già corrette!');
    return;
  }

  let fixed = 0, skipped = 0, failed = 0;

  for (let i = 0; i < broken.length; i++) {
    const p = broken[i];
    console.log(`\n${C.bright}${C.yellow}── [${i + 1}/${broken.length}] ${p.name}${C.reset}`);

    const newUrl = await searchAmazonImage(p.name);

    if (!newUrl) {
      log(C.yellow, 'SKIP', 'Nessuna immagine trovata');
      skipped++;
    } else {
      const { error: upErr } = await supabase
        .from('products')
        .update({ image_url: newUrl })
        .eq('id', p.id);

      if (upErr) {
        log(C.red, 'ERR', `Update fallito: ${upErr.message}`);
        failed++;
      } else {
        log(C.green, 'FIXED', `✓ ${newUrl}`);
        fixed++;
      }
    }

    if (i < broken.length - 1) await delay(2500, 4500);
  }

  console.log(`\n${C.bright}${C.cyan}${'─'.repeat(58)}${C.reset}`);
  console.log(`${C.bright}${C.green}  ✓ Aggiornati: ${fixed}${C.reset}`);
  console.log(`${C.bright}${C.yellow}  ↺ Saltati:    ${skipped}${C.reset}`);
  if (failed > 0) console.log(`${C.bright}${C.red}  ✗ Errori:     ${failed}${C.reset}`);
  console.log(`${C.bright}${C.cyan}${'─'.repeat(58)}${C.reset}\n`);
}

main().catch(err => {
  console.error(C.red + '[FATAL] ' + err.message + C.reset);
  process.exit(1);
});
