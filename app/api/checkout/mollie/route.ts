import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getMollieClient } from '@/lib/mollie'

/**
 * Ritorna true se l'URL è pubblicamente raggiungibile da Mollie:
 * - deve essere HTTPS
 * - non deve essere localhost / 127.0.0.1 / IP privato
 */
function isPublicHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (host === 'localhost') return false
    if (host === '127.0.0.1' || host === '::1') return false
    if (/^10\./.test(host)) return false
    if (/^192\.168\./.test(host)) return false
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
    return true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const { product_id, customer_name, customer_email, customer_phone, shipping_address } =
      await request.json()

    if (!product_id || !customer_name || !customer_email || !shipping_address) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
    }

    const db = getServiceClient()

    // Prezzo lato server — mai fidarsi del client
    const { data: product, error: prodErr } = await db
      .from('products')
      .select('id, title, price_current')
      .eq('id', product_id)
      .single()

    if (prodErr || !product) {
      return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 })
    }

    // Crea l'ordine con status 'open'
    const { data: order, error: orderErr } = await db
      .from('orders')
      .insert({
        product_id,
        customer_name,
        customer_email,
        customer_phone: customer_phone ?? '',
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

    const mollie = getMollieClient()

    // siteUrl: prendi da MOLLIE_WEBHOOK_URL (override esplicito) oppure NEXT_PUBLIC_SITE_URL
    const siteUrl =
      process.env.MOLLIE_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    // Includi il webhook SOLO se il siteUrl è un endpoint HTTPS pubblico raggiungibile da Mollie.
    // In localhost, tunnel non configurato, o http:// → omette webhookUrl silenziosamente.
    const isDev = process.env.NODE_ENV !== 'production'
    const webhookBase = process.env.MOLLIE_WEBHOOK_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
    const includeWebhook = !isDev && isPublicHttpsUrl(webhookBase)

    const redirectUrl = `${siteUrl}/checkout/success?order_id=${order.id}`

    const payment = await mollie.payments.create({
      amount: { currency: 'EUR', value: product.price_current.toFixed(2) },
      description: `Kitwer26 — ${product.title}`,
      redirectUrl,
      ...(includeWebhook
        ? { webhookUrl: `${webhookBase}/api/webhooks/mollie` }
        : {}),
      metadata: {
        order_id: order.id,
        customer_phone: customer_phone ?? '',
      },
    })

    // Salva mollie_id sull'ordine
    await db.from('orders').update({ mollie_id: payment.id }).eq('id', order.id)

    if (isDev) {
      console.log('\n─────────────────────────────────────────')
      console.log('🔗 [DEV] Pagamento Mollie creato')
      console.log(`   Mollie ID  : ${payment.id}`)
      console.log(`   Checkout   : ${payment.getCheckoutUrl()}`)
      console.log(`   Redirect   : ${redirectUrl}`)
      console.log(`   Webhook    : ${includeWebhook ? 'attivo' : 'DISABILITATO (localhost)'}`)
      console.log('─────────────────────────────────────────\n')
    }

    return NextResponse.json({ paymentUrl: payment.getCheckoutUrl() })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
