/**
 * Script di popolazione descrizioni tramite DeepSeek
 *
 * Uso:
 *   node scripts/generate-descriptions.mjs
 *
 * Requisiti in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   (o SERVICE_ROLE_KEY per bypassare RLS)
 *   DEEPSEEK_API_KEY
 *
 * Lo script legge tutti i prodotti senza description, chiama DeepSeek
 * e aggiorna Supabase. Usa una concurrency di 3 per non saturare l'API.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carica variabili d'ambiente da .env.local manualmente
function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    for (const line of raw.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    }
  } catch {
    // .env.local non trovato, usa variabili d'ambiente di sistema
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const CONCURRENCY = 3;
const DELAY_MS = 500; // pausa tra ogni richiesta

async function generateDescription(title, variantAttributes) {
  const prompt = variantAttributes
    ? `Scrivi una descrizione prodotto per: "${title}" — variante: ${variantAttributes}`
    : `Scrivi una descrizione prodotto per: "${title}"`;

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            'Sei un copywriter esperto in e-commerce tech. Scrivi descrizioni prodotto concise, tecniche e coinvolgenti in italiano. Massimo 120 parole. Solo testo puro.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('📦 Recupero prodotti senza descrizione...');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, variantAttributes, description')
    .or('description.is.null,description.eq.');

  if (error) {
    console.error('Errore Supabase:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${products.length} prodotti da aggiornare\n`);

  let done = 0;

  // Processa in chunk da CONCURRENCY
  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const chunk = products.slice(i, i + CONCURRENCY);

    await Promise.all(
      chunk.map(async (p) => {
        try {
          const description = await generateDescription(p.title, p.variantAttributes);

          const { error: updateError } = await supabase
            .from('products')
            .update({ description })
            .eq('id', p.id);

          if (updateError) throw updateError;

          done++;
          console.log(`[${done}/${products.length}] ✓ ${p.title.slice(0, 60)}`);
        } catch (e) {
          console.error(`[ERRORE] ${p.title.slice(0, 60)}: ${e.message}`);
        }
      })
    );

    await sleep(DELAY_MS);
  }

  console.log(`\n🎉 Completato: ${done}/${products.length} descrizioni generate.`);
}

main();
