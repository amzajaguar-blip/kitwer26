/**
 * KITWER26 — SYSTEM AUDIT SCRIPT
 * Scansiona tutti i record del DB e produce report Pass/Fail per ogni check.
 * Run: node _audit.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = 'https://layehkivpxlscamgfive.supabase.co';
const SERVICE_ROLE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheWVoa2l2cHhsc2NhbWdmaXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ1OTY3MiwiZXhwIjoyMDg3MDM1NjcyfQ.HuNtliv7G_cvPlJb-KEeGfXXyQ710kMVWvXEDtXpPd8';

const AFFILIATE_TAGS = ['kitwer26-21','kitwer2600-21','kitwer2609-21','kitwer260f-21','kitwer2606-21'];
const PRICE_MAX      = 5000;
const PRICE_MIN      = 0.01;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── helpers ────────────────────────────────────────────────────────────────

const sep  = () => console.log('─'.repeat(72));
const pass = (msg) => console.log(`  ✅ PASS  ${msg}`);
const fail = (msg) => console.log(`  ❌ FAIL  ${msg}`);
const info = (msg) => console.log(`  ℹ  INFO  ${msg}`);
const warn = (msg) => console.log(`  ⚠  WARN  ${msg}`);

function shortId(id) { return String(id).slice(0,8); }

// ─── fetch ALL products (loop di pagine) ────────────────────────────────────

async function fetchAll() {
  const PAGE = 1000;
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, sub_category, image_url, image_urls, product_url, price, is_budget_king')
      .range(from, from + PAGE - 1);
    if (error) { console.error('Supabase error:', error.message); process.exit(1); }
    all = all.concat(data ?? []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           KITWER26 — SYSTEM AUDIT REPORT                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  const products = await fetchAll();
  const TOTAL = products.length;
  console.log(`  📦 Totale record recuperati: ${TOTAL}\n`);

  // ══════════════════════════════════════════════════════════════════════
  // CHECK 1 — MISSING ASSETS (image_url vuoto / null)
  // ══════════════════════════════════════════════════════════════════════
  sep();
  console.log('CHECK 1 — MISSING ASSETS');
  sep();

  const noImage = products.filter(p => {
    const url = (p.image_url ?? '').trim();
    return !url || !url.startsWith('http');
  });

  const hasImageUrls = noImage.filter(p => Array.isArray(p.image_urls) && p.image_urls.some(u => u?.startsWith('http')));
  const totallyBlind = noImage.filter(p => !Array.isArray(p.image_urls) || !p.image_urls.some(u => u?.startsWith('http')));

  if (noImage.length === 0) {
    pass(`Tutti i ${TOTAL} prodotti hanno image_url valido.`);
  } else {
    fail(`${noImage.length}/${TOTAL} prodotti senza image_url valido`);
    if (hasImageUrls.length) info(`  → ${hasImageUrls.length} hanno almeno un'immagine in image_urls[] (fallback disponibile)`);
    if (totallyBlind.length) {
      warn(`  → ${totallyBlind.length} TOTALMENTE SENZA IMMAGINE (nemmeno image_urls[]):`);
      totallyBlind.slice(0, 20).forEach(p =>
        console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,60) ?? 'N/A'}`)
      );
      if (totallyBlind.length > 20) console.log(`       ... e altri ${totallyBlind.length - 20}`);
    }
    info(`Lista completa prodotti senza image_url:`);
    noImage.slice(0, 30).forEach(p =>
      console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,55) ?? 'N/A'}  image_urls=${Array.isArray(p.image_urls)?p.image_urls.length:0}`)
    );
    if (noImage.length > 30) console.log(`       ... e altri ${noImage.length - 30}`);
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHECK 2 — PRICE ANOMALIES
  // ══════════════════════════════════════════════════════════════════════
  sep();
  console.log('CHECK 2 — PRICE ANOMALIES');
  sep();

  const zeroPrices   = products.filter(p => { const v = parseFloat(p.price ?? ''); return !isNaN(v) && v < PRICE_MIN; });
  const nullPrices   = products.filter(p => p.price === null || p.price === undefined || String(p.price).trim() === '');
  const highPrices   = products.filter(p => { const v = parseFloat(p.price ?? ''); return !isNaN(v) && v > PRICE_MAX; });
  const nanPrices    = products.filter(p => { const v = parseFloat(p.price ?? ''); return isNaN(v) && p.price !== null && String(p.price).trim() !== ''; });

  if (zeroPrices.length === 0 && nullPrices.length === 0 && highPrices.length === 0 && nanPrices.length === 0) {
    pass(`Nessuna anomalia di prezzo su ${TOTAL} prodotti.`);
  } else {
    if (zeroPrices.length > 0) {
      fail(`${zeroPrices.length} prodotti con prezzo = 0 o negativo:`);
      zeroPrices.forEach(p => console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,55)} — price=${p.price}`));
    }
    if (nullPrices.length > 0) {
      warn(`${nullPrices.length} prodotti con prezzo NULL/vuoto:`);
      nullPrices.slice(0,20).forEach(p => console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,55)}`));
      if (nullPrices.length > 20) console.log(`       ... e altri ${nullPrices.length - 20}`);
    }
    if (highPrices.length > 0) {
      warn(`${highPrices.length} prodotti con prezzo > ${PRICE_MAX}€ (verifica manuale):`);
      highPrices.forEach(p => console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,45)} — price=${p.price}`));
    }
    if (nanPrices.length > 0) {
      fail(`${nanPrices.length} prodotti con prezzo NON NUMERICO:`);
      nanPrices.forEach(p => console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,45)} — price="${p.price}"`));
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHECK 3 — BROKEN AFFILIATE LINKS
  // ══════════════════════════════════════════════════════════════════════
  sep();
  console.log('CHECK 3 — BROKEN / MISSING AFFILIATE LINKS');
  sep();

  const noUrl       = products.filter(p => !p.product_url || !String(p.product_url).trim());
  const hasUrl      = products.filter(p =>  p.product_url &&  String(p.product_url).trim());
  const missingTag  = hasUrl.filter(p => !AFFILIATE_TAGS.some(tag => p.product_url.includes(tag)));
  const wrongDomain = hasUrl.filter(p => !p.product_url.includes('amazon.'));

  if (noUrl.length === 0 && missingTag.length === 0) {
    pass(`Tutti i ${TOTAL} prodotti hanno product_url con tag affiliato.`);
  } else {
    if (noUrl.length > 0) {
      fail(`${noUrl.length} prodotti SENZA product_url:`);
      noUrl.slice(0,20).forEach(p => console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,55)}`));
      if (noUrl.length > 20) console.log(`       ... e altri ${noUrl.length - 20}`);
    }
    if (missingTag.length > 0) {
      fail(`${missingTag.length} prodotti con product_url MA senza tag affiliato:`);
      missingTag.slice(0,20).forEach(p => console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,40)} → ${String(p.product_url).slice(0,70)}`));
      if (missingTag.length > 20) console.log(`       ... e altri ${missingTag.length - 20}`);
    }
    if (wrongDomain.length > 0) {
      warn(`${wrongDomain.length} product_url NON Amazon:`);
      wrongDomain.slice(0,10).forEach(p => console.log(`       [${shortId(p.id)}] ${String(p.product_url).slice(0,70)}`));
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHECK 4 — CATEGORY ORPHANAGE (sub_category NULL)
  // ══════════════════════════════════════════════════════════════════════
  sep();
  console.log('CHECK 4 — CATEGORY ORPHANAGE (sub_category mancante)');
  sep();

  const noSubCat = products.filter(p => !p.sub_category || !String(p.sub_category).trim());

  if (noSubCat.length === 0) {
    pass(`Tutti i ${TOTAL} prodotti hanno sub_category assegnata.`);
  } else {
    warn(`${noSubCat.length} prodotti senza sub_category. Assegno 'general'...`);
    noSubCat.slice(0,10).forEach(p =>
      console.log(`       [${shortId(p.id)}] ${p.name?.slice(0,55)} [cat: ${p.category}]`)
    );
    if (noSubCat.length > 10) console.log(`       ... e altri ${noSubCat.length - 10}`);

    // Aggiorna in batch (max 50 per volta per rispettare rate limit)
    const ids = noSubCat.map(p => p.id);
    const BATCH = 50;
    let updated = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const batch = ids.slice(i, i + BATCH);
      const { error: updErr } = await supabase
        .from('products')
        .update({ sub_category: 'general' })
        .in('id', batch);
      if (updErr) {
        fail(`Batch update fallito (ids ${i}-${i+BATCH}): ${updErr.message}`);
      } else {
        updated += batch.length;
      }
    }
    if (updated === noSubCat.length) {
      pass(`✔ ${updated} prodotti aggiornati a sub_category='general'`);
    } else {
      warn(`Aggiornati ${updated}/${noSubCat.length} — alcuni batch falliti`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // SUMMARY TABLE
  // ══════════════════════════════════════════════════════════════════════
  sep();
  console.log('RIEPILOGO AUDIT');
  sep();
  console.log(`  Totale prodotti:           ${TOTAL}`);
  console.log(`  Senza image_url:           ${noImage.length}  (${totallyBlind.length} totalmente ciechi)`);
  console.log(`  Price anomalies:           ${zeroPrices.length + nullPrices.length + nanPrices.length} (+ ${highPrices.length} high-ticket da verificare)`);
  console.log(`  Missing affiliate tag:     ${noUrl.length + missingTag.length}`);
  console.log(`  sub_category fixati:       ${noSubCat.length}`);
  console.log('');
  console.log('  CHECK 5 (unoptimized) → vedi output separato sopra\n');
}

main().catch(console.error);
