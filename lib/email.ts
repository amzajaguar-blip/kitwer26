/**
 * Kitwer26 — Email transazionali via Resend
 *
 * Variabili .env richieste:
 *   RESEND_API_KEY=re_xxxx
 *   RESEND_FROM=Kitwer26 <noreply@kitwer26.com>   (opzionale, default incluso)
 *   KITWER_ADMIN_NAME=Marco                        (opzionale)
 */

import { Resend } from 'resend'

// Lazy: istanziato solo quando serve, non al caricamento del modulo.
// Evita crash durante il build se RESEND_API_KEY non è definita.
function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.RESEND_FROM ?? 'Kitwer26 <noreply@kitwer26.com>'
const ADMIN_NAME = process.env.KITWER_ADMIN_NAME ?? 'Marco'
const SUPPORT_EMAIL = 'kitwer26@zohomail.eu'
const SUPPORT_PHONE = '+39 3756443391'

/* ─────────────────────────────────────────────────────────────
   Helpers di styling condivisi
───────────────────────────────────────────────────────────── */
function baseHtml(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:'Helvetica Neue',Arial,sans-serif;">
  <!-- Preheader invisibile -->
  <div style="display:none;max-height:0;overflow:hidden;color:#0f0f13;">${preheader}</div>

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#1a1a24;border-radius:16px;border:1px solid #2d2d3d;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a24 0%,#252536 100%);padding:28px 32px;border-bottom:1px solid #2d2d3d;text-align:center;">
              <div style="display:inline-block;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:6px 14px;margin-bottom:12px;">
                <span style="color:#f59e0b;font-size:13px;font-weight:700;letter-spacing:1.5px;">KITWER26</span>
              </div>
              <p style="margin:0;color:#94a3b8;font-size:13px;">${title}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #2d2d3d;text-align:center;">
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;">
                Hai bisogno di aiuto?
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#f59e0b;text-decoration:none;">${SUPPORT_EMAIL}</a>
                &nbsp;|&nbsp;
                <a href="tel:${SUPPORT_PHONE.replace(/\s/g,'')}" style="color:#f59e0b;text-decoration:none;">${SUPPORT_PHONE}</a>
              </p>
              <p style="margin:0;color:#4a5568;font-size:11px;">
                Kitwer26 — Gaming Hardware &amp; Streaming Gear
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/* ─────────────────────────────────────────────────────────────
   EMAIL 1: Prodotto Acquistato
   (Trigger: admin clicca "Segna come Acquistato")
───────────────────────────────────────────────────────────── */
export async function sendOrderPurchased(opts: {
  to: string
  customerName: string
  orderId: string
  productTitle: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY non configurata — email non inviata')
    return { ok: false, error: 'RESEND_API_KEY mancante' }
  }

  const shortId = opts.orderId.slice(0, 8).toUpperCase()

  const body = `
    <!-- Saluto -->
    <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Ciao <strong style="color:#f1f5f9;">${opts.customerName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;">
      sono <strong style="color:#f1f5f9;">${ADMIN_NAME}</strong> di Kitwer26.
      Volevo avvisarti personalmente di una bella notizia riguardo al tuo ordine!
    </p>

    <!-- Card ordine -->
    <div style="background:#0f0f13;border:1px solid #2d2d3d;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;">Ordine</p>
      <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f59e0b;">#${shortId}</p>
      <p style="margin:0;font-size:14px;color:#f1f5f9;">${opts.productTitle}</p>
    </div>

    <!-- Messaggio principale -->
    <div style="border-left:3px solid #f59e0b;padding-left:16px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:14px;color:#f1f5f9;font-weight:600;">
        Ho appena concluso l'acquisto del tuo prodotto dal nostro fornitore.
      </p>
      <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
        Ora il prodotto entrerà in una fase di <strong style="color:#f1f5f9;">controllo qualità</strong>
        per assicurarci che sia in condizioni perfette prima di spedirtelo.
        Ci tengo che tu riceva esattamente quello che ti aspetti.
      </p>
    </div>

    <!-- Steps -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#252536;border-radius:10px 0 0 10px;border:1px solid #f59e0b;">
          <div style="font-size:20px;margin-bottom:6px;">✅</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#f59e0b;">Acquistato</p>
          <p style="margin:4px 0 0;font-size:10px;color:#94a3b8;">Ordine inviato</p>
        </td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#1a1a24;border-top:1px solid #2d2d3d;border-bottom:1px solid #2d2d3d;">
          <div style="font-size:20px;margin-bottom:6px;">🔍</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#f1f5f9;">Controllo Qualità</p>
          <p style="margin:4px 0 0;font-size:10px;color:#f59e0b;">In corso</p>
        </td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#1a1a24;border-radius:0 10px 10px 0;border:1px solid #2d2d3d;">
          <div style="font-size:20px;margin-bottom:6px;">🚚</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;">Spedizione</p>
          <p style="margin:4px 0 0;font-size:10px;color:#64748b;">Prossimo step</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Ti invierò il <strong style="color:#f1f5f9;">codice di tracciamento</strong> non appena
      il corriere prenderà in carico il pacco (previsto entro 2-3 giorni lavorativi).
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;">
      Grazie per la fiducia — ci vediamo presto!
    </p>

    <p style="margin:0;font-size:14px;color:#f1f5f9;">
      Un saluto,<br/>
      <strong>${ADMIN_NAME}</strong> — Team Kitwer26
    </p>
  `

  const { error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `Ottime notizie per il tuo ordine #${shortId}! 📦`,
    html: baseHtml(
      `Aggiornamento Ordine #${shortId}`,
      `${opts.customerName}, il tuo prodotto è stato acquistato e ora è in controllo qualità!`,
      body
    ),
  })

  if (error) {
    console.error('[email] sendOrderPurchased error:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/* ─────────────────────────────────────────────────────────────
   EMAIL 2: Ordine Spedito con Tracking
   (Trigger: admin inserisce tracking e clicca "Invia Tracking")
───────────────────────────────────────────────────────────── */
export async function sendOrderShipped(opts: {
  to: string
  customerName: string
  orderId: string
  productTitle: string
  trackingId: string
  trackingUrl?: string
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY non configurata — email non inviata')
    return { ok: false, error: 'RESEND_API_KEY mancante' }
  }

  const shortId = opts.orderId.slice(0, 8).toUpperCase()

  // Genera URL tracking: se non fornito usa BRT come default (comune in IT)
  const trackingUrl =
    opts.trackingUrl ||
    `https://www.brt.it/tracking?id=${encodeURIComponent(opts.trackingId)}`

  const body = `
    <!-- Saluto -->
    <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Ciao <strong style="color:#f1f5f9;">${opts.customerName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;">
      sono <strong style="color:#f1f5f9;">${ADMIN_NAME}</strong> di Kitwer26.
      Siamo felici di dirti che il tuo ordine è in viaggio verso di te!
    </p>

    <!-- Card ordine -->
    <div style="background:#0f0f13;border:1px solid #2d2d3d;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;">Ordine</p>
      <p style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f59e0b;">#${shortId}</p>
      <p style="margin:0 0 10px;font-size:14px;color:#f1f5f9;">${opts.productTitle}</p>
      <div style="background:#252536;border-radius:8px;padding:10px 14px;display:inline-block;">
        <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Tracking: </span>
        <span style="font-size:14px;font-weight:700;color:#22d3ee;font-family:monospace;">${opts.trackingId}</span>
      </div>
    </div>

    <!-- Steps -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#1a1a24;border-radius:10px 0 0 10px;border:1px solid #2d2d3d;">
          <div style="font-size:20px;margin-bottom:6px;">✅</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;">Acquistato</p>
        </td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#1a1a24;border-top:1px solid #2d2d3d;border-bottom:1px solid #2d2d3d;">
          <div style="font-size:20px;margin-bottom:6px;">✅</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;">Controllo Qualità</p>
        </td>
        <td width="33%" style="text-align:center;padding:12px 8px;background:#252536;border-radius:0 10px 10px 0;border:1px solid #22d3ee;">
          <div style="font-size:20px;margin-bottom:6px;">🚚</div>
          <p style="margin:0;font-size:11px;font-weight:700;color:#22d3ee;">In Viaggio!</p>
          <p style="margin:4px 0 0;font-size:10px;color:#22d3ee;">In consegna</p>
        </td>
      </tr>
    </table>

    <!-- Messaggio principale -->
    <p style="margin:0 0 12px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Il tuo ordine ha superato tutti i controlli qualità ed è stato
      <strong style="color:#f1f5f9;">affidato al corriere</strong>.
      Abbiamo fatto del nostro meglio per prepararlo rapidamente!
    </p>

    <!-- CTA Tracking -->
    <div style="text-align:center;margin:28px 0;">
      <a href="${trackingUrl}"
         style="display:inline-block;background:#22d3ee;color:#0f0f13;font-weight:700;font-size:15px;
                padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">
        🔍 Traccia il Tuo Pacco
      </a>
      <p style="margin:10px 0 0;font-size:12px;color:#64748b;">
        Il link potrebbe impiegare 12-24 ore prima di mostrare i primi aggiornamenti.
      </p>
    </div>

    <p style="margin:0 0 8px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Siamo a tua completa disposizione per qualsiasi dubbio o curiosità.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;">
      Grazie per aver scelto Kitwer26!
    </p>

    <p style="margin:0;font-size:14px;color:#f1f5f9;">
      Un saluto,<br/>
      <strong>${ADMIN_NAME}</strong> — Team Kitwer26
    </p>
  `

  const { error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: `Il tuo ordine #${shortId} è in viaggio verso di te 🚚`,
    html: baseHtml(
      `Ordine #${shortId} Spedito!`,
      `${opts.customerName}, il tuo pacco è in consegna! Tracking: ${opts.trackingId}`,
      body
    ),
  })

  if (error) {
    console.error('[email] sendOrderShipped error:', error)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
