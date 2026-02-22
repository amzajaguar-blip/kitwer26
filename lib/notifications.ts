// ============================================================
// Kitwer26 — Notification System
// Attualmente in modalità MOCK (console.log visibili nel server)
// Produzione: sostituire i console.log con Resend / Twilio / etc.
// ============================================================

export interface OrderDetails {
  orderId: string
  productTitle: string
  totalAmount: number
  customerName: string
  shippingAddress: string
}

export async function sendOrderConfirmation(
  email: string,
  phone: string | undefined,
  order: OrderDetails
): Promise<void> {
  const line = '─'.repeat(55)

  // ── EMAIL MOCK ──────────────────────────────────────────
  console.log('\n' + line)
  console.log('🟢  [MOCK EMAIL INVIATA]')
  console.log(line)
  console.log(`  A:        ${email}`)
  console.log(`  Oggetto:  Ordine Confermato — Kitwer26 #${order.orderId.slice(0, 8).toUpperCase()}`)
  console.log(`  Prodotto: ${order.productTitle}`)
  console.log(`  Totale:   €${order.totalAmount.toFixed(2)}`)
  console.log(`  Cliente:  ${order.customerName}`)
  console.log(`  Spedire:  ${order.shippingAddress}`)
  console.log(line + '\n')

  // ── SMS / WHATSAPP MOCK ──────────────────────────────────
  if (phone) {
    console.log(line)
    console.log('🟡  [MOCK SMS/WHATSAPP INVIATO]')
    console.log(line)
    console.log(`  A:        ${phone}`)
    console.log(`  Testo:    "Ciao ${order.customerName.split(' ')[0]}! Il tuo ordine Kitwer26`)
    console.log(`             per "${order.productTitle}" è confermato.`)
    console.log(`             Riceverai aggiornamenti sulla spedizione. 🎮"`)
    console.log(line + '\n')
  }

  // TODO produzione — rimpiazza con:
  // await resend.emails.send({ from: 'noreply@kitwer26.com', to: email, ... })
  // await twilio.messages.create({ to: phone, body: '...', from: process.env.TWILIO_FROM })
}
