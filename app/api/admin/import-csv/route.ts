import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Minimal RFC-4180 CSV parser (handles quoted fields with commas/newlines)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  // Normalise line endings
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const nonEmpty = lines.filter((l) => l.trim())
  if (nonEmpty.length < 2) return []

  const headers = parseCSVLine(nonEmpty[0]).map((h) => h.trim().toLowerCase())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < nonEmpty.length; i++) {
    const values = parseCSVLine(nonEmpty[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').trim()
    })
    // Skip completely empty rows
    if (Object.values(row).some((v) => v)) rows.push(row)
  }
  return rows
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'Nessun file allegato' }, { status: 400 })
    }
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({ error: 'Il file deve essere in formato CSV' }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV vuoto o formato non valido' }, { status: 400 })
    }

    const db = getServiceClient()
    let imported = 0
    const errors: string[] = []

    for (const row of rows) {
      const title = row.title || row.nome || row.name || ''
      if (!title) {
        errors.push(`Riga ignorata: colonna "title" mancante o vuota`)
        continue
      }

      const slug =
        row.slug || toSlug(title) || ''
      if (!slug) {
        errors.push(`Riga ignorata: impossibile generare slug per "${title}"`)
        continue
      }

      const priceRaw =
        row.price_current || row.price || row.prezzo || '0'
      const priceCurrent = parseFloat(priceRaw.replace(',', '.'))
      const priceOriginalRaw =
        row.price_original || row.prezzo_originale || ''
      const priceOriginal = priceOriginalRaw
        ? parseFloat(priceOriginalRaw.replace(',', '.'))
        : null

      const product = {
        title,
        slug,
        description: row.description || row.descrizione || '',
        image_url: row.image_url || row.immagine || '',
        price_current: isNaN(priceCurrent) ? 0 : priceCurrent,
        price_original: priceOriginal && !isNaN(priceOriginal) ? priceOriginal : null,
        currency: 'EUR',
        category: row.category || row.categoria || 'Accessori',
        // Generic variants / sizes — stored as TEXT
        sizes: row.sizes || row.varianti || row.variants || null,
        // Colors — stored as TEXT
        colors: row.colors || row.colori || null,
        meta_title: row.meta_title || null,
        meta_description: row.meta_description || null,
        is_direct_sell: row.is_direct_sell === 'true' || row.is_direct_sell === '1',
      }

      // Upsert: on conflict on slug → update all fields
      const { error } = await db
        .from('products')
        .upsert(product, { onConflict: 'slug' })

      if (error) {
        errors.push(`"${slug}": ${error.message}`)
      } else {
        imported++
      }
    }

    return NextResponse.json({ imported, total: rows.length, errors })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
