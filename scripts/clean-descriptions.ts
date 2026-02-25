/**
 * clean-descriptions.ts
 * ─────────────────────
 * Scansiona la colonna `description` nella tabella `products` di Supabase.
 * Rimuove nomi propri di persona (Sara, Marco, Luca, ecc.) e riformula
 * l'attacco della frase per renderlo universale e professionale.
 *
 * Esegui con:
 *   npx tsx scripts/clean-descriptions.ts
 *
 * Opzioni:
 *   --dry-run   Mostra le modifiche senza scrivere su DB
 *   --apply     Scrive le modifiche su Supabase
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('❌  Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(supabaseUrl, serviceKey)

// ─── Nomi da rimuovere (aggiungi qui se ne compaiono altri) ───────────────────
const NAMES_TO_STRIP = [
  'Sara', 'Marco', 'Luca', 'Giulia', 'Francesco', 'Sofia', 'Alessandro',
  'Valentina', 'Matteo', 'Elisa', 'Andrea', 'Federica', 'Davide', 'Chiara',
]

// ─── Pattern di sostituzione ──────────────────────────────────────────────────
interface ReplacementRule {
  pattern: RegExp
  replacement: string
  note: string
}

function buildRules(): ReplacementRule[] {
  const rules: ReplacementRule[] = []

  for (const name of NAMES_TO_STRIP) {
    // Caso: "Sara, se cerchi" → "Se cerchi"
    rules.push({
      pattern: new RegExp(`\\b${name},?\\s+se\\s+`, 'gi'),
      replacement: 'Se ',
      note: `"${name}, se" → "Se"`,
    })

    // Caso: "Sara, per te" → "Per chi cerca"
    rules.push({
      pattern: new RegExp(`\\b${name},?\\s+per\\s+te\\b`, 'gi'),
      replacement: 'Per chi cerca',
      note: `"${name}, per te" → "Per chi cerca"`,
    })

    // Caso: "Sara, questo" → "Questo"
    rules.push({
      pattern: new RegExp(`\\b${name},\\s+`, 'gi'),
      replacement: '',
      note: `"${name}," → rimosso`,
    })

    // Caso: nome a inizio frase senza virgola "Sara questo è..."
    rules.push({
      pattern: new RegExp(`^${name}\\s+`, 'gim'),
      replacement: '',
      note: `"${name} [...]" inizio riga → rimosso`,
    })
  }

  // Pattern aggiuntivi universali
  rules.push(
    // "per te gamer" → "per il gamer"
    {
      pattern: /\bper te gamer\b/gi,
      replacement: 'per il gamer',
      note: '"per te gamer" → "per il gamer"',
    },
    // "Pensato per te" → "Pensato per chi cerca"
    {
      pattern: /\bpensato per te\b/gi,
      replacement: 'pensato per chi cerca',
      note: '"pensato per te" → "pensato per chi cerca"',
    },
    // "perfetto per te" → "perfetto per ogni gamer"
    {
      pattern: /\bperfetto per te\b/gi,
      replacement: 'perfetto per ogni gamer',
      note: '"perfetto per te" → "perfetto per ogni gamer"',
    },
  )

  return rules
}

// ─── Pulizia singola descrizione ─────────────────────────────────────────────
function cleanDescription(original: string): { cleaned: string; changes: string[] } {
  let text = original
  const changes: string[] = []
  const rules = buildRules()

  for (const rule of rules) {
    const before = text
    text = text.replace(rule.pattern, rule.replacement)
    if (text !== before) {
      changes.push(rule.note)
    }
  }

  // Capitalizza la prima lettera dopo ogni sostituzione
  text = text.replace(/(^|\.\s+)([a-z])/g, (_, pre, letter) => pre + letter.toUpperCase())

  // Rimuovi doppi spazi
  text = text.replace(/  +/g, ' ').trim()

  return { cleaned: text, changes }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const isDryRun = !process.argv.includes('--apply')

  console.log('──────────────────────────────────────────')
  console.log('  Kitwer26 — Pulizia Descrizioni Prodotti')
  console.log('──────────────────────────────────────────')
  console.log(isDryRun
    ? '  MODALITÀ: DRY RUN (nessuna modifica al DB)\n  Per applicare: npx tsx scripts/clean-descriptions.ts --apply\n'
    : '  MODALITÀ: SCRITTURA SU SUPABASE\n')

  // 1. Fetch tutti i prodotti
  const { data: products, error } = await db
    .from('products')
    .select('id, title, slug, description')
    .order('title')

  if (error) {
    console.error('❌  Errore fetch prodotti:', error.message)
    process.exit(1)
  }

  console.log(`📦  Prodotti trovati: ${products.length}\n`)

  let modifiedCount = 0
  const toUpdate: { id: string; title: string; description: string }[] = []

  // 2. Analizza ogni prodotto
  for (const product of products) {
    if (!product.description) continue

    const { cleaned, changes } = cleanDescription(product.description)

    if (cleaned !== product.description) {
      modifiedCount++
      console.log(`\n🔧  ${product.title}`)
      console.log(`   Slug: ${product.slug}`)
      changes.forEach(c => console.log(`   ✏️  ${c}`))
      console.log(`   PRIMA:  "${product.description.slice(0, 120)}..."`)
      console.log(`   DOPO:   "${cleaned.slice(0, 120)}..."`)

      toUpdate.push({ id: product.id, title: product.title, description: cleaned })
    }
  }

  if (modifiedCount === 0) {
    console.log('✅  Nessuna descrizione da modificare. Il DB è già pulito!')
    return
  }

  console.log(`\n──────────────────────────────────────────`)
  console.log(`  Totale prodotti da modificare: ${modifiedCount}`)
  console.log('──────────────────────────────────────────\n')

  // 3. Applica le modifiche se --apply
  if (!isDryRun) {
    console.log('💾  Scrittura su Supabase...\n')

    for (const item of toUpdate) {
      const { error: updateError } = await db
        .from('products')
        .update({ description: item.description })
        .eq('id', item.id)

      if (updateError) {
        console.error(`❌  ERRORE aggiornamento "${item.title}":`, updateError.message)
      } else {
        console.log(`✅  Aggiornato: ${item.title}`)
      }
    }

    console.log('\n✨  Pulizia completata!')
  } else {
    console.log('ℹ️   DRY RUN: nessuna modifica eseguita.')
    console.log('    Esegui con --apply per scrivere sul DB.\n')
  }
}

main().catch(err => {
  console.error('Errore fatale:', err)
  process.exit(1)
})
