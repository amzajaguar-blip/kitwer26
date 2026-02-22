import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { sendOrderPurchased } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { order_id } = await request.json()
    if (!order_id) {
      return NextResponse.json({ error: 'order_id obbligatorio' }, { status: 400 })
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

    if (!['paid'].includes(order.payment_status)) {
      return NextResponse.json(
        { error: `Stato ordine non valido: ${order.payment_status}. Atteso: paid` },
        { status: 400 }
      )
    }

    // Aggiorna stato su Supabase
    const { error: updateErr } = await db
      .from('orders')
      .update({ payment_status: 'purchased' })
      .eq('id', order_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Invia email al cliente
    const emailResult = await sendOrderPurchased({
      to: order.customer_email,
      customerName: order.customer_name,
      orderId: order.id,
      productTitle: (order.products as { title: string } | null)?.title ?? 'il tuo prodotto',
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
