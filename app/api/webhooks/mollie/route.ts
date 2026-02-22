import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getMollieClient } from '@/lib/mollie'
import { sendOrderConfirmation } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const paymentId = formData.get('id') as string

    if (!paymentId) {
      return NextResponse.json({ ok: true })
    }

    const mollie = getMollieClient()
    const payment = await mollie.payments.get(paymentId)

    let status: 'paid' | 'failed' | null = null
    if (payment.status === 'paid') {
      status = 'paid'
    } else if (['failed', 'canceled', 'expired'].includes(payment.status)) {
      status = 'failed'
    }

    if (status) {
      const db = getServiceClient()

      await db
        .from('orders')
        .update({ payment_status: status })
        .eq('mollie_id', paymentId)

      // Invia notifica di conferma quando il pagamento è completato
      if (status === 'paid') {
        const { data: order } = await db
          .from('orders')
          .select('*, products(title)')
          .eq('mollie_id', paymentId)
          .single()

        if (order) {
          await sendOrderConfirmation(
            order.customer_email,
            (payment.metadata as Record<string, string>)?.customer_phone,
            {
              orderId: order.id,
              productTitle: order.products?.title ?? 'Prodotto',
              totalAmount: order.total_amount,
              customerName: order.customer_name,
              shippingAddress: order.shipping_address,
            }
          )
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Always return 200 for Mollie (prevents retries)
    return NextResponse.json({ ok: true })
  }
}
