import { Resend } from 'resend';
import { OrderConfirmation } from '@/components/emails/OrderConfirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Kitwer26 <info@kitwer26.com>';

/**
 * Invia email di conferma ordine al cliente.
 * Usata dal webhook Mollie quando status === "paid".
 */
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  orderNumber: string,
  customerName: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from:    FROM,
    to:      customerEmail,
    subject: `Conferma Ordine #${orderNumber}`,
    react:   OrderConfirmation({ orderNumber, customerName }),
  });

  if (error) {
    throw new Error(`[email] sendOrderConfirmationEmail: ${error.message}`);
  }
}

/**
 * Invia notifica interna all'admin con HTML grezzo (nessun template React necessario).
 */
export async function sendAdminEmail(opts: {
  subject: string;
  html:    string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kitwer26.com';

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      adminEmail,
    subject: opts.subject,
    html:    opts.html,
  });

  if (error) {
    console.warn('[email] sendAdminEmail:', error.message);
    // Non blocca il flusso
  }
}
