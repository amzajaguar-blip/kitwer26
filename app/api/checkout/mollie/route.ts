import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getMollieClient } from '@/lib/mollie'

export async function POST(request: NextRequest) {
  try {
    const { product_id, customer_name, customer_email, shipping_address } = await request.json()

    if (!product_id || !customer_name || !customer_email || !shipping_address) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
    }

    const db = getServiceClient()

    // Fetch product for real price (never trust client)
    const { data: product, error: prodErr } = await db
      .from('products')
      .select('id, title, price_current')
      .eq('id', product_id)
      .single()

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    }

    // Create order with status 'open'
    const { data: order, error: orderErr } = await db
      .from('orders')
      .insert({
        product_id,
        customer_name,
        customer_email,
        shipping_address,
        total_amount: product.price_current,
        payment_status: 'open',
        mollie_id: null,
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Errore creazione ordine' }, { status: 500 })
    }

    // Create Mollie payment
    const mollie = getMollieClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const payment = await mollie.payments.create({
      amount: { currency: 'EUR', value: product.price_current.toFixed(2) },
      description: `Kitwer26 - ${product.title}`,
      redirectUrl: `${siteUrl}/checkout/success?order_id=${order.id}`,
      webhookUrl: `${siteUrl}/api/webhooks/mollie`,
      metadata: { order_id: order.id },
    })

    // Update order with mollie_id
    await db
      .from('orders')
      .update({ mollie_id: payment.id })
      .eq('id', order.id)

    return NextResponse.json({ paymentUrl: payment.getCheckoutUrl() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
