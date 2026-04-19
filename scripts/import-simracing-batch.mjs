import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  for (const line of raw.split('\n')) {
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}
loadEnv();

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
);

// Image IDs extracted from Amazon.it search results (pre-CAPTCHA, all verified real)
const PRODUCTS = [
  {
    name: 'Logitech G923 Trueforce — Volante Force Feedback PS4/PC',
    category: 'Sim Racing',
    sub_category: 'steering-wheels',
    price: 399,
    is_top_tier: true,
    is_budget_king: false,
    asin: 'B07W7KFFFF',
    image_id: '61HPuztGCnL',
  },
  {
    name: 'Thrustmaster T300RS GT Edition — Volante Force Feedback PS4/PC',
    category: 'Sim Racing',
    sub_category: 'steering-wheels',
    price: 449,
    is_top_tier: true,
    is_budget_king: false,
    asin: 'B01HRYFODO',
    image_id: '71vf7FTHtAL',
  },
  {
    name: 'Fanatec ClubSport Pedals V3 — Pedaliera Pro Loadcell',
    category: 'Sim Racing',
    sub_category: 'pedals',
    price: 299,
    is_top_tier: true,
    is_budget_king: false,
    asin: 'B075V648RB',
    image_id: '81ccgJYRlHL',
  },
  {
    name: 'Thrustmaster TH8A Shifter — Cambio H/Sequential Add-On',
    category: 'Sim Racing',
    sub_category: 'shifters',
    price: 149,
    is_top_tier: false,
    is_budget_king: false,
    asin: 'B005L0Z2BQ',
    image_id: '51YKlHkm8KL',
  },
  {
    name: 'Sparco Meca 3 Racing Gloves — Guanti da Corsa Grip',
    category: 'Sim Racing',
    sub_category: 'general',
    price: 45,
    is_top_tier: false,
    is_budget_king: true,
    asin: 'B01MS6TPAC',
    image_id: '81f+WSeFHiL',
  },
  {
    name: 'Logitech G920 Driving Force — Volante Force Feedback Xbox/PC',
    category: 'Sim Racing',
    sub_category: 'steering-wheels',
    price: 299,
    is_top_tier: false,
    is_budget_king: false,
    asin: 'B011N78DMA',
    image_id: '61FXhka8F4L',
  },
  {
    name: 'Thrustmaster T818 Black Edition — Base Direct Drive 10Nm PC',
    category: 'Sim Racing',
    sub_category: 'steering-wheels',
    price: 699,
    is_top_tier: true,
    is_budget_king: false,
    asin: 'B0G2BV2LP2',
    image_id: '71JuZCMLFbL',
  },
  {
    name: 'Asetek Forte Sim Racing Pedals — Pedaliera Loadcell Gas+Freno',
    category: 'Sim Racing',
    sub_category: 'pedals',
    price: 499,
    is_top_tier: true,
    is_budget_king: false,
    asin: 'B00CWXYEFA',
    image_id: '41EVfYPbpiL',
  },
];

function buildRow(p) {
  return {
    name: p.name,
    category: p.category,
    sub_category: p.sub_category,
    price: p.price,
    is_top_tier: p.is_top_tier,
    is_budget_king: p.is_budget_king,
    is_active: true,
    image_url: `https://m.media-amazon.com/images/I/${p.image_id}._AC_SL1500_.jpg`,
    product_url: `https://www.amazon.it/dp/${p.asin}?tag=kitwer26-21`,
    affiliate_url: `https://www.amazon.it/dp/${p.asin}?tag=kitwer26-21`,
  };
}

async function main() {
  console.log('=== import-simracing-batch ===\n');

  const rows = PRODUCTS.map(buildRow);
  const { data, error } = await sb.from('products').insert(rows).select('id, name');

  if (error) {
    console.error('INSERT FAILED:', error.message);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} products:`);
  data.forEach(p => console.log(`  ${p.id} | ${p.name.slice(0, 60)}`));

  // Force-fix is_active bug (fires on every insert)
  const ids = data.map(p => p.id);
  const { error: fixErr } = await sb.from('products').update({ is_active: true }).in('id', ids);
  if (fixErr) {
    console.error('Force-fix is_active FAILED:', fixErr.message);
  } else {
    console.log(`\nForce-activated ${ids.length} products (is_active bug fix)`);
  }

  // Verify
  const { data: verify } = await sb.from('products')
    .select('id, name, is_active, image_url, product_url')
    .in('id', ids)
    .order('id');

  console.log('\n--- Verification ---');
  let allOk = true;
  for (const p of verify ?? []) {
    const fakeImg = /(.{2,})\1{2,}/.test(p.image_url?.match(/\/images\/I\/([^.]+)/)?.[1] ?? '');
    const ok = p.is_active && !fakeImg && p.product_url?.includes('kitwer26-21');
    if (!ok) allOk = false;
    console.log(`${ok ? '✓' : '✗'} ${p.id} | active=${p.is_active} | ${p.name.slice(0, 50)}`);
  }

  const { data: count } = await sb.from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'Sim Racing')
    .eq('is_active', true);

  console.log(`\nSim Racing active total: ${count ?? '?'}`);
  console.log(allOk ? '\n✓ All products OK' : '\n✗ Some products need attention');
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
