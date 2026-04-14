import { createClient } from '@supabase/supabase-js';
const s = createClient('https://layehkivpxlscamgfive.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxheWVoa2l2cHhsc2NhbWdmaXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTQ1OTY3MiwiZXhwIjoyMDg3MDM1NjcyfQ.HuNtliv7G_cvPlJb-KEeGfXXyQ710kMVWvXEDtXpPd8');

const {data} = await s.from('products').select('category, sub_category, price, is_active, name').order('sub_category');

const subs = {};
data.forEach(p => {
  const key = p.category + ' > ' + (p.sub_category || 'NONE');
  if (!subs[key]) subs[key] = { total: 0, active: 0, samples: [] };
  subs[key].total++;
  if (p.price > 0 && p.is_active !== false) {
    subs[key].active++;
    if (subs[key].samples.length < 2) subs[key].samples.push(p.name?.substring(0, 60));
  }
});

console.log('Sub-category | Total | Active | Sample Products');
console.log('-------------|-------|--------|----------------');
Object.entries(subs).sort((a,b) => b[1].active - a[1].active).forEach(([k,v]) => {
  console.log(`${k} | ${v.total} | ${v.active} | ${v.samples.join(' // ')}`);
});
