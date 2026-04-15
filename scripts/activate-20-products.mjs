import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXCLUDE = /rasoio|wilkinson|gillette|shaver|razor|beauty|makeup|abbigliam|moda\b|lipstick|mascara|perfume|profumo/i;

const CATS = {
  crypto: /ledger|trezor|hardware wallet|cold storage|\bmining\b|\basic\b|\bfpga\b|billfodl|cryptosteel|seed\s*(plate|phrase)/i,
  fpv: /\bfpv\b|\bdrone\b|\bdji\b|geprc|radiomaster|insta360|betaflight|\bquad(copter)?\b|tbs|ovonic|gepr|tango|taranis|goggles.*v\d/i,
  sim: /sim\s*racing|moza|thrustmaster|fanatec|logitech\s*g(29|923|920)|racing\s*wheel|sim\s*(wheel|pedal)|load\s*cell|shifter|handbrake/i,
  smart: /smart\s*home|security\s*camera|ultraloq|hiseeu|matter|zigbee|homekit|smart\s*hub|smart\s*lock|doorbell|reolink|eufy|aqara|philips\s*hue/i,
};

const BLOG_PRIORITY = /ledger|trezor|billfodl|geprc|radiomaster|ovonic|dji\s*mini|insta360|moza\s*(r3|xp1)|ultraloq|hiseeu/i;

function classify(p) {
  const blob = `${p.name || ''} ${p.category || ''} ${p.sub_category || ''}`;
  if (EXCLUDE.test(blob)) return null;
  for (const [key, rx] of Object.entries(CATS)) {
    if (rx.test(blob)) return key;
  }
  return null;
}

async function fetchAll() {
  let all = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await sb
      .from('products')
      .select('id,name,category,sub_category,price,image_url,product_url,is_active,is_top_tier')
      .eq('is_active', false)
      .not('image_url', 'is', null)
      .gte('price', 15)
      .lte('price', 2000)
      .range(from, from + size - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

(async () => {
  const rows = await fetchAll();
  console.log(`Fetched ${rows.length} inactive candidates (with image + price in range)`);

  const valid = rows.filter((r) => {
    const url = (r.product_url || '').toLowerCase();
    if (!/amazon|amzn/.test(url)) return false;
    return classify(r) !== null;
  });
  console.log(`After amazon-url + category filter: ${valid.length}`);

  // bucket by category
  const buckets = { crypto: [], fpv: [], sim: [], smart: [] };
  for (const r of valid) {
    const c = classify(r);
    if (c) buckets[c].push({ ...r, _cat: c, _blog: BLOG_PRIORITY.test(r.name || '') });
  }

  // sort each bucket: blog priority first, then price desc (higher-value first)
  for (const k of Object.keys(buckets)) {
    buckets[k].sort((a, b) => {
      if (a._blog !== b._blog) return a._blog ? -1 : 1;
      return (b.price || 0) - (a.price || 0);
    });
  }

  console.log('Bucket sizes:', Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])));

  // first pass: grab all blog-priority matches (cap 12 total blog picks)
  const picked = [];
  const pickedIds = new Set();
  const blogPicks = valid
    .filter((r) => BLOG_PRIORITY.test(r.name || ''))
    .sort((a, b) => (b.price || 0) - (a.price || 0));
  for (const r of blogPicks) {
    if (picked.length >= 12) break;
    if (!pickedIds.has(r.id)) {
      picked.push({ ...r, _cat: classify(r), _blog: true });
      pickedIds.add(r.id);
    }
  }

  // second pass: round-robin balance across 4 categories to 20 total, 5 each target
  const targetPerCat = 5;
  const perCatCount = { crypto: 0, fpv: 0, sim: 0, smart: 0 };
  for (const p of picked) perCatCount[p._cat]++;

  let changed = true;
  while (picked.length < 20 && changed) {
    changed = false;
    for (const cat of ['crypto', 'fpv', 'sim', 'smart']) {
      if (picked.length >= 20) break;
      if (perCatCount[cat] >= targetPerCat) continue;
      const next = buckets[cat].find((x) => !pickedIds.has(x.id));
      if (next) {
        picked.push(next);
        pickedIds.add(next.id);
        perCatCount[cat]++;
        changed = true;
      }
    }
  }
  // fill remaining ignoring cap
  if (picked.length < 20) {
    const pool = [...buckets.crypto, ...buckets.fpv, ...buckets.sim, ...buckets.smart]
      .filter((x) => !pickedIds.has(x.id))
      .sort((a, b) => (b.price || 0) - (a.price || 0));
    for (const p of pool) {
      if (picked.length >= 20) break;
      picked.push(p);
      pickedIds.add(p.id);
    }
  }

  console.log(`\nSelected ${picked.length} products to activate:`);
  console.table(
    picked.map((p) => ({
      id: p.id,
      cat: p._cat,
      blog: p._blog ? 'Y' : '',
      price: p.price,
      name: (p.name || '').slice(0, 60),
    }))
  );

  if (picked.length === 0) {
    console.log('Nothing to activate. Exiting.');
    return;
  }

  const ids = picked.map((p) => p.id);
  const { error: upErr } = await sb.from('products').update({ is_active: true }).in('id', ids);
  if (upErr) {
    console.error('UPDATE error:', upErr);
    process.exit(1);
  }
  console.log(`\nActivated ${ids.length} products.`);

  const { count, error: cErr } = await sb
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (cErr) console.error(cErr);
  console.log(`Total is_active=true now: ${count}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
