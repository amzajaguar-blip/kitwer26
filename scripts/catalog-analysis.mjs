import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://layehkivpxlscamgfive.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheWVoa2l2cHhsc2NhbWdmaXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ1OTY3MiwiZXhwIjoyMDg3MDM1NjcyfQ.HuNtliv7G_cvPlJb-KEeGfXXyQ710kMVWvXEDtXpPd8'
);

async function run() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, image_url, is_active, amazon_price, asin, sub_category')
    .order('category');

  if (error) { console.error(error); return; }

  const cats = {};
  data.forEach(p => {
    const cat = p.category || 'UNCATEGORIZED';
    if (!cats[cat]) cats[cat] = { total: 0, active: 0, hidden: 0, noImage: 0, products: [] };
    cats[cat].total++;
    const isActive = p.price > 0 && p.is_active !== false;
    if (isActive) {
      cats[cat].active++;
      cats[cat].products.push({ name: p.name, price: p.price, image_url: p.image_url, asin: p.asin, amazon_price: p.amazon_price, sub_category: p.sub_category });
      if (!p.image_url) cats[cat].noImage++;
    } else {
      cats[cat].hidden++;
    }
  });

  const sorted = Object.entries(cats).sort((a, b) => b[1].active - a[1].active);

  console.log('=== CATEGORY DISTRIBUTION ===');
  console.log('Category | Total | Active | Hidden | NoImg');
  console.log('---------|-------|--------|--------|------');
  let totalAll = 0, activeAll = 0, hiddenAll = 0;
  sorted.forEach(([cat, info]) => {
    console.log(`${cat} | ${info.total} | ${info.active} | ${info.hidden} | ${info.noImage}`);
    totalAll += info.total; activeAll += info.active; hiddenAll += info.hidden;
  });
  console.log(`TOTALS | ${totalAll} | ${activeAll} | ${hiddenAll}`);

  console.log('\n=== TOP 3 PRODUCTS BY PRICE PER CATEGORY ===');
  sorted.forEach(([cat, info]) => {
    const top = info.products.sort((a, b) => b.price - a.price).slice(0, 3);
    if (top.length > 0) {
      console.log(`\n[${cat}]`);
      top.forEach(p => console.log(`  ${p.price.toFixed(2)} EUR - ${(p.name || '').substring(0, 80)}`));
    }
  });

  console.log('\n=== OVERALL TOP 15 BY PRICE ===');
  const allActive = data.filter(p => p.price > 0).sort((a, b) => b.price - a.price).slice(0, 15);
  allActive.forEach(p => console.log(`${p.price.toFixed(2)} EUR | ${p.category} | ${(p.name || '').substring(0, 80)} | has_img=${!!p.image_url}`));

  // Output JSON for plan generation
  console.log('\n=== JSON_DATA_START ===');
  console.log(JSON.stringify({ categories: sorted.map(([cat, info]) => ({ category: cat, total: info.total, active: info.active, hidden: info.hidden })), totalAll, activeAll, hiddenAll }));
  console.log('=== JSON_DATA_END ===');
}

run();
