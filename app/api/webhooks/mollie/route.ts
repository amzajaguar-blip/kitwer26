import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'
import { getMollieClient } from '@/lib/mollie'

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
    }

    return NextResponse.json({ ok: true })
  } catch {
    // Always return 200 for Mollie (prevents retries)
    return NextResponse.json({ ok: true })
  }
}
