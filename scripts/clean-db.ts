/**
 * CLEAN-DB — Svuota completamente la tabella products su Supabase.
 *
 * Run: npx tsx scripts/clean-db.ts
 *
 * Richiede in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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
  } catch {
    // .env.local non trovato — usa variabili di sistema
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
);

async function cleanDb() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  CLEAN-DB — Svuoto la tabella products');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Conta i prodotti prima della cancellazione
  const { count: before, error: countErr } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('❌ Errore connessione Supabase:', countErr.message);
    process.exit(1);
  }

  console.log(`  Prodotti presenti nel DB: ${before ?? 0}`);

  if ((before ?? 0) === 0) {
    console.log('\n  ✅ Tabella già vuota — nessuna azione necessaria.\n');
    return;
  }

  console.log('  Elimino tutti i prodotti...');

  // Supabase richiede un filtro per DELETE; usiamo is not null sull'id
  const { error: delErr } = await supabase
    .from('products')
    .delete()
    .not('id', 'is', null);

  if (delErr) {
    console.error('❌ Errore durante la cancellazione:', delErr.message);
    process.exit(1);
  }

  // Verifica post-cancellazione
  const { count: after } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  console.log(`\n  ✅ Eliminati ${before} prodotti.`);
  console.log(`  Prodotti rimasti nel DB: ${after ?? 0}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

cleanDb().catch((err) => {
  console.error('FATAL:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
