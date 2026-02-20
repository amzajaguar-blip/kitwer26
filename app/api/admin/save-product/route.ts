import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const product = await request.json()

    // Validazione base
    if (!product.title || !product.slug || !product.category) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: title, slug, category' }, { status: 400 })
    }

    const { data, error } = await db
      .from('products')
      .insert({
        title: product.title,
        slug: product.slug,
        description: product.description ?? '',
        image_url: product.image_url ?? '',
        price_current: product.price_current ?? 0,
        price_original: product.price_original ?? null,
        currency: 'EUR',
        category: product.category,
        is_direct_sell: product.is_direct_sell ?? false,
        is_bundle: product.is_bundle ?? false,
        bundle_items: product.bundle_items ?? [],
        specs: product.specs ?? {},
        meta_title: product.meta_title ?? null,
        meta_description: product.meta_description ?? null,
      })
      .select('id, title, slug')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ product: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
