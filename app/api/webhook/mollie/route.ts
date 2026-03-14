import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MARKETPLACE, buildAffiliateUrl, extractAsinFromUrl } from '@/lib/marketplace';
import type { AmazonLocale } from '@/lib/marketplace';

const MOLLIE_API = 'https://api.mollie.com/v2';

/**
 * POST /api/webhook/mollie
 *
 * Webhook ricevuto da Mollie quando lo stato del pagamento cambia:
 * - paid: pagamento completato → stato ordine → "confirmed"
 * - failed/cancelled: pagamento fallito → stato ordine → "cancelled"
 */
export async function POST(req: NextRequest) {
  // Leggi il body
  const body = new URLSearchParams(await req.text());
  const paymentId = body.get('id');

  if (!paymentId) {
    console.warn('[mollie-webhook] Payment ID mancante');
    return NextResponse.json({ error: 'Payment ID mancante' }, { status: 400 });
  }

  console.log(`[mollie-webhook] Ricevuto webhook per pagamento: ${paymentId}`);

  // ── Supabase client ─────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
                   || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[mollie-webhook] SUPABASE env mancanti');
    return NextResponse.json(
      { error: 'Configurazione server mancante' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── 1. Fetch dettagli pagamento da Mollie ──────────────────────────────────
  const mollieKey = process.env.MOLLIE_API_KEY;

  if (!mollieKey) {
    console.error('[mollie-webhook] MOLLIE_API_KEY non configurato');
    return NextResponse.json(
      { error: 'Mollie key mancante' },
      { status: 500 }
    );
  }

  try {
    const paymentRes = await fetch(`${MOLLIE_API}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${mollieKey}`,
        'Content-Type': 'application/json',
      },
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      throw new Error(
        paymentData?.detail || paymentData?.title || 'Errore fetch Mollie'
      );
    }

    const status = paymentData.status; // e.g., "paid", "failed", "cancelled"
    const orderId = paymentData?.metadata?.order_id;

    console.log(`[mollie-webhook] Pagamento ${paymentId} status: ${status}, order: ${orderId}`);

    if (!orderId) {
      console.warn('[mollie-webhook] order_id non trovato in metadata');
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    // ── 2. Aggiorna stato ordine in Supabase ────────────────────────────────────
    let newOrderStatus = 'pending'; // default

    switch (status) {
      case 'paid':
        newOrderStatus = 'confirmed';
        break;
      case 'pending':
      case 'open':
        newOrderStatus = 'pending';
        break;
      case 'failed':
      case 'expired':
      case 'cancelled':
        newOrderStatus = 'cancelled';
        break;
      default:
        newOrderStatus = 'pending';
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: newOrderStatus })
      .eq('id', orderId);

    if (updateErr) {
      console.error('[mollie-webhook] Errore aggiornamento ordine:', updateErr.message);
      // Continua comunque — il webhook deve rispondere 200
    } else {
      console.log(`[mollie-webhook] Ordine ${orderId} aggiornato a: ${newOrderStatus}`);
    }

    // ── 3. Notifica email admin (opzionale, se pagamento confermato) ───────────
    if (status === 'paid') {
      const resendKey = process.env.RESEND_API_KEY;
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@kitwer26.com';
      const fromEmail = process.env.FROM_EMAIL || 'notifiche@kitwer26.com';

      if (resendKey) {
        try {
          const { data: orderData } = await supabase
            .from('orders')
            .select(
              'id, created_at, customer_name, customer_surname, customer_email, customer_phone, customer_address, customer_city, customer_cap, customer_country, total_amount, order_items(*)'
            )
            .eq('id', orderId)
            .single();

          if (orderData) {
            // ── Paese e link Amazon locale ─────────────────────────────────────
            const locale: AmazonLocale =
              (orderData.customer_country as AmazonLocale) && MARKETPLACE[orderData.customer_country as AmazonLocale]
                ? (orderData.customer_country as AmazonLocale)
                : 'it';
            const market = MARKETPLACE[locale];

            // Costruisce il link Amazon locale per ogni prodotto (se ASIN disponibile)
            const itemsHtml = (orderData.order_items || [])
              .map((item: any) => {
                const asin      = item.product_url ? extractAsinFromUrl(item.product_url) : null;
                const localUrl  = asin ? buildAffiliateUrl(asin, locale) : (item.product_url ?? null);
                const linkHtml  = localUrl
                  ? `<a href="${localUrl}" style="color:#00D4FF;font-size:11px;word-break:break-all;">${localUrl}</a>`
                  : '<span style="color:#666;font-size:11px;">N/A</span>';
                return `<tr>
                  <td style="padding:6px 0;color:#aaa;vertical-align:top;">${item.product_title}<br>${linkHtml}</td>
                  <td style="padding:6px 0;text-align:right;vertical-align:top;">x${item.quantity}</td>
                  <td style="padding:6px 0;text-align:right;font-weight:bold;vertical-align:top;">€${(item.price_at_purchase / item.quantity).toFixed(2)}</td>
                </tr>`;
              })
              .join('');

            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: `Kitwer26 <${fromEmail}>`,
                to: [adminEmail],
                subject: `✅ Pagamento Confermato — Ordine ${String(orderId).slice(0, 8)}`,
                html: `
                  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#111;color:#eee;padding:24px;border-radius:8px;">
                    <h2 style="color:#00FF94;margin-top:0;">✅ Pagamento Confermato</h2>

                    <p style="margin:0 0 4px;"><strong>Ordine:</strong> <span style="font-family:monospace;font-size:12px;">${orderId}</span></p>
                    <p style="margin:0 0 4px;"><strong>Cliente:</strong> ${orderData.customer_name} ${orderData.customer_surname}</p>
                    ${orderData.customer_email ? `<p style="margin:0 0 4px;"><strong>Email:</strong> ${orderData.customer_email}</p>` : ''}
                    ${orderData.customer_phone ? `<p style="margin:0 0 4px;"><strong>Telefono:</strong> ${orderData.customer_phone}</p>` : ''}
                    ${orderData.customer_address ? `<p style="margin:0 0 16px;"><strong>Indirizzo:</strong> ${orderData.customer_address}, ${orderData.customer_cap ?? ''} ${orderData.customer_city ?? ''}</p>` : ''}

                    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                      ${itemsHtml}
                      <tr style="border-top:1px solid #333;">
                        <td colspan="2" style="padding:8px 0;font-weight:bold;text-align:right;">Totale pagato:</td>
                        <td style="padding:8px 0;text-align:right;font-weight:bold;color:#00FF94;">€${orderData.total_amount.toFixed(2)}</td>
                      </tr>
                    </table>

                    <div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:12px;margin-top:12px;">
                      <p style="margin:0 0 4px;font-size:13px;font-weight:bold;">
                        ${market.flag} Marketplace: ${market.label}
                        <span style="font-weight:normal;color:#aaa;margin-left:8px;">Tag: ${market.tag}</span>
                      </p>
                    </div>

                    <p style="margin-top:20px;font-size:12px;color:#666;">
                      Accedi al pannello admin per visualizzare i dettagli completi e procedere con l'evasione.
                    </p>
                  </div>
                `,
              }),
            });
          }
        } catch (emailErr) {
          console.error('[mollie-webhook] Email send error:', emailErr);
        }
      }
    }

    // Mollie richiede risposta 200 OK
    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (err) {
    console.error('[mollie-webhook] Errore:', err);
    // Anche in caso di errore, rispondi 200 per evitare retry infiniti
    return NextResponse.json({ message: 'Processed with error' }, { status: 200 });
  }
}
