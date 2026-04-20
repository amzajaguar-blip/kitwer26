/**
 * lib/email.ts — Servizio Email Kitwer26
 *
 * Ogni email al cliente ha una copia automatica all'admin (ADMIN_NOTIFY_EMAIL).
 * sendOrderConfirmationEmail — conferma ordine pagato (+ PDF allegato)
 * sendShippingEmail          — notifica spedizione Amazon
 * sendPaymentFailedEmail     — recovery pagamento fallito
 * sendAdminEmail             — notifica interna HTML
 */

import { Resend } from 'resend';
import { OrderConfirmation } from '@/components/emails/OrderConfirmation';
import type { OrderConfirmationProps } from '@/components/emails/OrderConfirmation';
import { AssetDispatched } from '@/components/emails/AssetDispatched';
import type { AssetDispatchedProps } from '@/components/emails/AssetDispatched';
import { PaymentFailed } from '@/components/emails/PaymentFailed';
import { MissionDebriefing } from '@/components/emails/MissionDebriefing';
import { generateOperationalPdf } from '@/lib/pdf';
import type { TacticalDealItem } from '@/lib/pdf';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM          = process.env.FROM_EMAIL
  ? `Kitwer26 <${process.env.FROM_EMAIL.trim()}>`
  : 'Kitwer26 <info@kitwer26.com>';
/** Email admin che riceve copia di ogni notifica cliente */
const ADMIN_NOTIFY  = process.env.ADMIN_NOTIFY_EMAIL ?? 'jollypack13@protonmail.com';

export type { OrderConfirmationProps, AssetDispatchedProps };

// ── Tipi ──────────────────────────────────────────────────────────────────────

export interface SendConfirmationOpts {
  customerEmail:   string;
  orderId:         string;
  customerName:    string;
  items:           OrderConfirmationProps['items'];
  totalAmount:     number;
  discountAmount?: number;
  tacticalDeals?:  TacticalDealItem[];
}

// ── sendOrderConfirmationEmail ────────────────────────────────────────────────

/**
 * Invia conferma ordine al cliente + copia admin.
 * Trigger: webhook Stripe checkout.session.completed.
 * Allega PDF operativo. Lancia in caso di errore (il chiamante logga su Supabase).
 */
export async function sendOrderConfirmationEmail(opts: SendConfirmationOpts): Promise<void> {
  const shortId = String(opts.orderId).slice(0, 8).toUpperCase();

  // 1. Genera PDF allegato (best-effort)
  let pdfAttachment: { filename: string; content: string } | undefined;
  try {
    const pdfBytes = await generateOperationalPdf({
      orderId:       opts.orderId,
      customerName:  opts.customerName,
      items:         opts.items,
      totalAmount:   opts.totalAmount,
      tacticalDeals: opts.tacticalDeals ?? [],
    });
    pdfAttachment = {
      filename: 'KITWER26_OPERATIONAL_MANUAL.pdf',
      content:  Buffer.from(pdfBytes).toString('base64'),
    };
  } catch (pdfErr) {
    console.warn('[email] PDF generation failed (email sent without attachment):', pdfErr);
  }

  const subject     = `🚀 Il tuo Bundle Esclusivo è qui! Conferma Ordine Kitwer26 #${shortId}`;
  const reactEl     = OrderConfirmation({
    orderId:        opts.orderId,
    customerName:   opts.customerName,
    items:          opts.items,
    totalAmount:    opts.totalAmount,
    discountAmount: opts.discountAmount ?? 0,
  });
  const attachments = pdfAttachment ? [pdfAttachment] : [];

  // 2. Invia al cliente
  const { error } = await getResend().emails.send({
    from: FROM, to: opts.customerEmail, subject, react: reactEl, attachments,
  });

  if (error) {
    console.error('[email] Resend error:', JSON.stringify(error));
    throw new Error(`[email] sendOrderConfirmationEmail failed: ${error.message}`);
  }

  // 3. Copia admin (fire-and-forget)
  getResend().emails.send({
    from: FROM, to: ADMIN_NOTIFY, subject: `[COPIA ADMIN] ${subject}`, react: reactEl, attachments,
  }).catch(e => console.warn('[email] Copia admin confirmation fallita:', e));
}

// ── sendShippingEmail ─────────────────────────────────────────────────────────

/**
 * Notifica spedizione al cliente + copia admin.
 * Trigger: /api/admin/set-tracking
 */
export async function sendShippingEmail(opts: AssetDispatchedProps): Promise<void> {
  const shortId = String(opts.orderId).slice(0, 8).toUpperCase();
  const subject = `🛰️ [KITWER26] LOGISTICA: Asset #${shortId} in movimento`;
  const reactEl = AssetDispatched(opts);

  const { error } = await getResend().emails.send({
    from: FROM, to: opts.customerEmail ?? '', subject, react: reactEl,
  });

  if (error) {
    throw new Error(`[email] sendShippingEmail failed: ${error.message}`);
  }

  // Copia admin
  getResend().emails.send({
    from: FROM, to: ADMIN_NOTIFY, subject: `[COPIA ADMIN] ${subject}`, react: reactEl,
  }).catch(e => console.warn('[email] Copia admin shipping fallita:', e));
}

// ── sendPaymentFailedEmail ────────────────────────────────────────────────────

/**
 * Email di recovery per pagamento fallito/cancellato/scaduto.
 * Trigger: webhook Stripe checkout.session.async_payment_failed.
 */
export async function sendPaymentFailedEmail(opts: {
  customerEmail: string;
  customerName:  string;
  orderId:       string;
  checkoutUrl:   string;
}): Promise<void> {
  const shortId = opts.orderId.slice(0, 8).toUpperCase();
  const subject = `⚠️ [KITWER26] ALLERTA: Interruzione Protocollo di Acquisizione Asset #${shortId}`;
  const reactEl = PaymentFailed({
    orderId:      opts.orderId,
    customerName: opts.customerName,
    checkoutUrl:  opts.checkoutUrl,
  });

  const { error } = await getResend().emails.send({
    from: FROM, to: opts.customerEmail, subject, react: reactEl,
  });

  if (error) {
    throw new Error(`[email] sendPaymentFailedEmail failed: ${error.message}`);
  }

  // Copia admin
  getResend().emails.send({
    from: FROM, to: ADMIN_NOTIFY, subject: `[ALERT ADMIN] ${subject}`, react: reactEl,
  }).catch(e => console.warn('[email] Copia admin failure fallita:', e));
}

// ── sendDebriefingEmail ───────────────────────────────────────────────────────

/**
 * Email di follow-up 48h dopo la consegna.
 * Trigger: /api/cron/follow-up → verifica ordini DELIVERED con follow_up_sent=false.
 */
export async function sendDebriefingEmail(opts: {
  customerEmail: string;
  customerName:  string;
  orderId:       string;
  reviewUrl?:    string;
}): Promise<void> {
  const shortId = opts.orderId.slice(0, 8).toUpperCase();
  const subject = `📋 [KITWER26] DEBRIEFING: Conferma ricezione Asset #${shortId}`;
  const reactEl = MissionDebriefing({
    orderId:      opts.orderId,
    customerName: opts.customerName,
    reviewUrl:    opts.reviewUrl,
  });

  const { error } = await getResend().emails.send({
    from: FROM, to: opts.customerEmail, subject, react: reactEl,
  });

  if (error) throw new Error(`[email] sendDebriefingEmail failed: ${error.message}`);

  // Copia admin
  getResend().emails.send({
    from: FROM, to: ADMIN_NOTIFY, subject: `[COPIA ADMIN] ${subject}`, react: reactEl,
  }).catch(e => console.warn('[email] Copia admin debriefing fallita:', e));
}

// ── sendAdminEmail ────────────────────────────────────────────────────────────

/**
 * Notifica interna HTML (es. conferma ordine, logistica, alert).
 * Non blocca il flusso in caso di errore.
 */
export async function sendAdminEmail(opts: { subject: string; html: string }): Promise<void> {
  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      ADMIN_NOTIFY,
    subject: opts.subject,
    html:    opts.html,
  });

  if (error) {
    console.warn('[email] sendAdminEmail:', error.message);
  }
}
