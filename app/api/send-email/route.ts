/**
 * /api/send-email — Rotta generica per invio email via Resend.
 *
 * Body JSON:
 *   { to: string, subject: string, html: string, text?: string }
 *
 * Usata internamente da order-purchased e ship-order.
 * Può essere richiamata anche direttamente per email custom.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const FROM =
  process.env.RESEND_FROM ?? 'Kitwer26 <onboarding@resend.dev>'

export async function POST(request: NextRequest) {
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY non configurata' },
      { status: 503 }
    )
  }

  // Lazy instantiation — evita crash durante il build senza RESEND_API_KEY
  const resend = new Resend(process.env.RESEND_API_KEY)

  let body: { to: string; subject: string; html: string; text?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON non valido' }, { status: 400 })
  }

  const { to, subject, html, text } = body

  if (!to || !subject || !html) {
    return NextResponse.json(
      { error: 'Campi obbligatori: to, subject, html' },
      { status: 400 }
    )
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data?.id })
}
