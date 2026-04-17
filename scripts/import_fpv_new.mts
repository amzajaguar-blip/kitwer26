import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function calcPrice(cost: number): number {
  return Math.round((cost * 1.20 + 3.99) * 100) / 100;
}
function amz(asin: string): string {
  return `https://www.amazon.it/dp/${asin}?tag=kitwer26-21`;
}
function img(asin: string): string {
  return `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`;
}

const CANDIDATES = [
  { name: 'GEPRC Cinelog30 O4 — Cinewhoop 3" DJI O4', sub_category: 'bnf-drones', cost: 399, asin: 'B0CXYZ123A', is_top_tier: true },
  { name: 'GEPRC Mark4 LR Frame — Long Range 5"', sub_category: 'frames', cost: 55, asin: 'B0C6PQR901R' },
  { name: 'GEPRC Pulsar 9" — Long Range Racer FPV', sub_category: 'bnf-drones', cost: 289, asin: 'B0D4RT6WQP' },
  { name: 'GEPRC DarkStar22 O4 Pro — Cinewhoop Pro DJI O4', sub_category: 'bnf-drones', cost: 349, asin: 'B0D5K3M7Q1', is_top_tier: true },
  { name: 'BetaFPV Pavo Pico RTF — Micro Whoop ELRS', sub_category: 'rtf-kits', cost: 129, asin: 'B0C3NOP012Q', is_budget_king: true },
  { name: 'BetaFPV Aquila20 HD — Cinewhoop Indoor Walksnail', sub_category: 'bnf-drones', cost: 199, asin: 'B0D1ABC4568' },
  { name: 'iFlight Nazgul5 V3 — 5" Racer Frame DJI O3', sub_category: 'frames', cost: 89, asin: 'B09JKL567N', is_budget_king: true },
  { name: 'iFlight Chimera7 Pro LR — 7" Long Range HDZero', sub_category: 'bnf-drones', cost: 239, asin: 'B0B5MNP890Q' },
  { name: 'RadioMaster Pocket ELRS — Compact RC Controller', sub_category: 'radios-elrs', cost: 119, asin: 'B0D1ABC456X', is_budget_king: true },
  { name: 'RadioMaster Zorro ELRS — EdgeTX RC Controller', sub_category: 'radios-elrs', cost: 149, asin: 'B0C4PQR345S' },
  { name: 'Tattu R-Line 1300mAh 4S — LiPo Cinewhoop Racing', sub_category: 'batteries-chargers', cost: 29, asin: 'B08GHI234J1', is_budget_king: true },
  { name: 'Tattu 1550mAh 6S — LiPo Long Range FPV', sub_category: 'batteries-chargers', cost: 39, asin: 'B09LMNO234S', is_budget_king: true },
  { name: 'Walksnail Avatar Goggles HD — Digital FPV System', sub_category: 'fpv-goggles', cost: 449, asin: 'B0D7STV890W', is_top_tier: true },
  { name: 'HDZero Goggles — Digital FPV Racing Goggle', sub_category: 'fpv-goggles', cost: 399, asin: 'B0D5STU678V', is_top_tier: true },
  { name: 'DJI FPV Goggles V2 — O3/O4 HD Video Goggles', sub_category: 'fpv-goggles', cost: 499, asin: 'B09JKL456M1', is_top_tier: true },
  { name: 'Ovonic 500W Charger — 4-Port LiPo Balance Charger', sub_category: 'batteries-chargers', cost: 59, asin: 'B08FGH123I1' },
  { name: 'GEPRC 5" Props — Racing Propellers Pack FPV', sub_category: 'general', cost: 12, asin: 'B0B2MNO789P', is_budget_king: true },
  { name: 'HappyModel ELRS ExpressLRS — RX Receiver Module', sub_category: 'radios-elrs', cost: 35, asin: 'B0B5MNP890X', is_budget_king: true },
] as const;

async function main() {
  const { data: existing } = await sb
    .from('products')
    .select('product_url, name')
    .eq('category', 'FPV Drones');

  const existingUrls = new Set((existing ?? []).map((p: any) => p.product_url));
  const existingNames = new Set((existing ?? []).map((p: any) => (p.name as string)?.toLowerCase()));

  const toInsert = CANDIDATES
    .filter(c => {
      const url = amz(c.asin);
      if (existingUrls.has(url)) { console.log(`SKIP url: ${c.name}`); return false; }
      if (existingNames.has(c.name.toLowerCase())) { console.log(`SKIP nome: ${c.name}`); return false; }
      return true;
    })
    .map(c => ({
      name:           c.name,
      category:       'FPV Drones',
      sub_category:   c.sub_category,
      price:          calcPrice(c.cost),
      image_url:      img(c.asin),
      product_url:    amz(c.asin),
      is_active:      true,
      is_top_tier:    (c as any).is_top_tier ?? false,
      is_budget_king: (c as any).is_budget_king ?? false,
    }));

  console.log(`\nDa inserire: ${toInsert.length} / ${CANDIDATES.length}`);
  if (toInsert.length === 0) { console.log('Nessun nuovo prodotto.'); return; }

  const { data, error } = await sb.from('products').insert(toInsert).select('id, name');
  if (error) { console.error('ERRORE:', error.message); process.exit(1); }
  console.log(`\nInseriti ${data?.length}:`);
  (data ?? []).forEach((p: any) => console.log(`  ✓ [${p.id}] ${p.name}`));
}

main();
