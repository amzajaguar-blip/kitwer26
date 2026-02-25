import { getServiceClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/admin/variants?product_id=xxx  — lista varianti prodotto
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id required' }, { status: 400 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variants: data })
}

// POST /api/admin/variants  — crea nuova variante
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { product_id, variant_type, name, color_hex, price_override, stock_quantity, image_url, sort_order } = body

  if (!product_id || !name) {
    return NextResponse.json({ error: 'product_id e name sono obbligatori' }, { status: 400 })
  }

  const db = getServiceClient()
  const { data, error } = await db
    .from('product_variants')
    .insert({
      product_id,
      variant_type: variant_type ?? 'color',
      name,
      color_hex: color_hex || null,
      price_override: price_override || null,
      stock_quantity: stock_quantity ?? 0,
      image_url: image_url || null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variant: data })
}

// PATCH /api/admin/variants  — aggiorna variante (body: { id, ...fields })
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('product_variants')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variant: data })
}

// DELETE /api/admin/variants?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id richiesto' }, { status: 400 })

  const db = getServiceClient()
  const { error } = await db.from('product_variants').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
