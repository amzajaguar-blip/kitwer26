import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { sendOrderShipped } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { order_id, tracking_id, tracking_url } = await request.json()

    if (!order_id || !tracking_id?.trim()) {
      return NextResponse.json({ error: 'order_id e tracking_id obbligatori' }, { status: 400 })
    }

    const db = getServiceClient()

    // Recupera ordine + prodotto
    const { data: order, error: fetchErr } = await db
      .from('orders')
      .select('*, products(title)')
      .eq('id', order_id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 })
    }

    if (!['purchased', 'paid'].includes(order.payment_status)) {
      return NextResponse.json(
        { error: `Stato ordine non valido: ${order.payment_status}. Atteso: purchased o paid` },
        { status: 400 }
      )
    }

    // Aggiorna stato e tracking su Supabase
    const { error: updateErr } = await db
      .from('orders')
      .update({
        payment_status: 'shipped',
        tracking_id: tracking_id.trim(),
      })
      .eq('id', order_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Invia email di spedizione al cliente
    const emailResult = await sendOrderShipped({
      to: order.customer_email,
      customerName: order.customer_name,
      orderId: order.id,
      productTitle: (order.products as { title: string } | null)?.title ?? 'il tuo prodotto',
      trackingId: tracking_id.trim(),
      trackingUrl: tracking_url || undefined,
    })

    return NextResponse.json({
      ok: true,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? undefined : emailResult.error,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
