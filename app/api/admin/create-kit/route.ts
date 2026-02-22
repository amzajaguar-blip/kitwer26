import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

interface KitProductItem {
  product_id: string
  quantity: number
}

interface CreateKitBody {
  title: string
  slug: string
  description: string
  product_ids: KitProductItem[]
  discount_pct?: number
}

export async function POST(request: Request) {
  let body: CreateKitBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { title, slug, description, product_ids, discount_pct = 5 } = body

  if (!title || !slug || !description) {
    return NextResponse.json(
      { error: 'Missing required fields: title, slug, description' },
      { status: 400 }
    )
  }

  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json({ error: 'product_ids must be a non-empty array' }, { status: 400 })
  }

  if (discount_pct < 0 || discount_pct > 30) {
    return NextResponse.json({ error: 'discount_pct must be between 0 and 30' }, { status: 400 })
  }

  const db = getServiceClient()

  // 1. Fetch prices for all product ids
  const ids = product_ids.map((p) => p.product_id)
  const { data: products, error: fetchError } = await db
    .from('products')
    .select('id, price_current')
    .in('id', ids)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!products || products.length !== ids.length) {
    return NextResponse.json({ error: 'One or more product IDs not found' }, { status: 400 })
  }

  // 2. Build a price map and compute totals
  const priceMap = new Map(products.map((p) => [p.id, p.price_current as number]))

  let total = 0
  for (const item of product_ids) {
    const price = priceMap.get(item.product_id)
    if (price === undefined) {
      return NextResponse.json({ error: `Product ${item.product_id} not found` }, { status: 400 })
    }
    total += price * item.quantity
  }

  // 3. Apply discount and round to .99
  const discounted = total * (1 - discount_pct / 100)
  const price_current = Math.floor(discounted) + 0.99
  const price_original = parseFloat(total.toFixed(2))

  // 4. Insert kit
  const { data: kit, error: kitError } = await db
    .from('kits')
    .insert({
      title,
      slug,
      description,
      price_current,
      price_original,
      meta_title: title,
      meta_description: description.slice(0, 160),
    })
    .select('id, slug, price_current')
    .single()

  if (kitError) {
    return NextResponse.json({ error: kitError.message }, { status: 500 })
  }

  // 5. Insert kit_items
  const kitItems = product_ids.map((item) => ({
    kit_id: kit.id,
    product_id: item.product_id,
    quantity: item.quantity,
  }))

  const { error: itemsError } = await db.from('kit_items').insert(kitItems)

  if (itemsError) {
    // Roll back the kit on failure
    await db.from('kits').delete().eq('id', kit.id)
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ kit: { id: kit.id, slug: kit.slug, price_current: kit.price_current } })
}
