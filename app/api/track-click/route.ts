import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function POST(request: Request) {
  let body: { productId?: string; productSlug?: string; productTitle?: string; eventType?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { productId, productSlug, productTitle, eventType } = body

  if (!eventType || !productSlug || !productTitle) {
    return NextResponse.json(
      { error: 'Missing required fields: eventType, productSlug, productTitle' },
      { status: 400 }
    )
  }

  if (eventType !== 'page_view' && eventType !== 'click_buy') {
    return NextResponse.json(
      { error: 'eventType must be "page_view" or "click_buy"' },
      { status: 400 }
    )
  }

  const db = getServiceClient()

  const { error } = await db.from('analytics').insert({
    event_type: eventType,
    product_slug: productSlug,
    product_title: productTitle,
    product_id: productId ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
