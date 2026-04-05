import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { sendShippingEmail, sendAdminEmail } from '@/lib/email';

const Schema = z.object({
  orderId:              z.string().min(1),
  amazonTrackingLink:   z.string().url().regex(/^https?:\/\/([a-z0-9-]+\.)*amazon\.[a-z.]{2,6}(\/|$)/i, 'Deve essere un link Amazon valido'),
});

/**
 * POST /api/admin/set-tracking
 *
 * Segna l'ordine come spedito con il link di tracking Amazon.
 * Invia email al cliente + notifica admin (jollypack13@protonmail.com).
 */
export async function POST(req: NextRequest) {
  // Autenticazione gestita dal middleware — cookie kitwer_vault_session
  const body   = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { orderId, amazonTrackingLink } = parsed.data;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1. Carica ordine
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, total_amount, order_items(product_title, quantity, price_at_purchase)')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }

  // 2. Aggiorna DB — atomico
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ amazon_tracking_link: amazonTrackingLink, status: 'shipped' })
    .eq('id', orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const shortId  = orderId.slice(0, 8).toUpperCase();
  const margin   = (typeof order.total_amount === 'number' ? order.total_amount * 0.20 : 0).toFixed(2);
  const itemList = (order.order_items ?? [])
    .map((i: { product_title?: string; quantity?: number }) => `${i.product_title} ×${i.quantity}`)
    .join('<br>');

  // 3. Email cliente
  let emailSent = false;
  if (order.customer_email) {
    try {
      await sendShippingEmail({
        orderId,
        customerEmail:  order.customer_email,
        customerName:   order.customer_name ?? 'Operatore',
        trackingNumber: amazonTrackingLink,  // usiamo il link come tracking
        carrierUrl:     amazonTrackingLink,
        carrier:        'Amazon Logistics',
      });
      emailSent = true;
    } catch (err) {
      console.error('[set-tracking] Email cliente fallita:', err);
    }
  }

  // 4. Email admin — Manifesto di Spedizione
  try {
    await sendAdminEmail({
      subject: `🛰️ [KITWER26] MANIFESTO SPEDIZIONE — Ordine #${shortId}`,
      html: `
        <div style="font-family:monospace;background:#111;color:#eee;padding:24px;max-width:520px;">
          <h2 style="color:#22d3ee;margin-top:0;">🛰️ ASSET DISPACCIATO</h2>
          <p><strong>Ordine:</strong> ${orderId}</p>
          <p><strong>Cliente:</strong> ${order.customer_name} — ${order.customer_email}</p>
          <p><strong>Totale pagato:</strong> €${order.total_amount.toFixed(2)}</p>
          <p style="color:#ff9a3e;"><strong>Margine Netto (20%):</strong> €${margin}</p>
          <hr style="border-color:#333;">
          <p><strong>Asset spediti:</strong><br>${itemList}</p>
          <p><strong>Link Tracking Amazon:</strong><br>
            <a href="${amazonTrackingLink}" style="color:#22d3ee;">${amazonTrackingLink}</a>
          </p>
          <p><strong>Radar cliente:</strong><br>
            <a href="https://kitwer26.com/track/${orderId}" style="color:#22d3ee;">
              kitwer26.com/track/${orderId}
            </a>
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error('[set-tracking] Email admin fallita:', err);
  }

  return NextResponse.json({ success: true, emailSent });
}
