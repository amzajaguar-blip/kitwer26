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

const FIXES = [
  {
    id: 23876,
    name: 'BitBox02',
    image_url: 'https://m.media-amazon.com/images/I/51EM01uieNL._AC_SL1500_.jpg',
    is_active: true,
  },
  {
    id: 23877,
    name: 'Ellipal Titan 2.0 v2',
    image_url: 'https://m.media-amazon.com/images/I/61EY-ZE+hAL._AC_SL1500_.jpg',
    is_active: true,
  },
];

const DEACTIVATE_ID = 23808;

async function main() {
  console.log('=== fix-crypto-images ===\n');

  for (const fix of FIXES) {
    const { error } = await sb
      .from('products')
      .update({ image_url: fix.image_url, is_active: fix.is_active })
      .eq('id', fix.id);
    if (error) {
      console.error(`FAIL ${fix.id} ${fix.name}:`, error.message);
    } else {
      console.log(`OK   ${fix.id} ${fix.name}`);
      console.log(`     → ${fix.image_url}`);
    }
  }

  const { error: deErr } = await sb
    .from('products')
    .update({ is_active: false })
    .eq('id', DEACTIVATE_ID);
  if (deErr) {
    console.error(`FAIL deactivate ${DEACTIVATE_ID}:`, deErr.message);
  } else {
    console.log(`\nDEACTIVATED ${DEACTIVATE_ID} (Ellipal duplicate B09YMQ9V3L)`);
  }

  const { data } = await sb
    .from('products')
    .select('id, name, is_active, image_url')
    .in('id', [23808, 23872, 23873, 23874, 23875, 23876, 23877])
    .order('id');

  console.log('\n--- Verification ---');
  for (const p of data ?? []) {
    const imgFake = /(.{2,})\1{2,}/.test(p.image_url?.match(/\/images\/I\/([^.]+)/)?.[1] ?? '');
    const imgPlaceholder = p.image_url?.includes('placeholder');
    const imgOk = p.image_url && !imgFake && !imgPlaceholder;
    const flag = p.is_active && imgOk ? '✓' : '✗';
    console.log(`${flag} ${p.id} | active=${p.is_active} | imgOk=${imgOk} | ${p.name.slice(0, 50)}`);
  }
}

main().catch(e => { console.error('[FATAL]', e.message); process.exit(1); });
