import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendShippingEmail } from '@/lib/email';
import { z } from 'zod';

const ShipOrderSchema = z.object({
  orderId:        z.string().min(1),
  trackingNumber: z.string().min(1),
  carrierUrl:     z.string().url().optional(),
  carrier:        z.string().optional(),
  estimatedDays:  z.number().int().positive().optional(),
  adminSecret:    z.string().min(1),
});

/**
 * POST /api/admin/ship-order
 *
 * Chiamato dall'admin panel quando l'ordine viene spedito.
 * Aggiorna tracking_number + carrier_url in Supabase e invia email al cliente.
 *
 * Body: { orderId, trackingNumber, carrierUrl?, carrier?, estimatedDays?, adminSecret }
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = ShipOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dati non validi', details: parsed.error.flatten() }, { status: 400 });
  }

  const { orderId, trackingNumber, carrierUrl, carrier, estimatedDays, adminSecret } = parsed.data;

  // Verifica secret admin — .trim() obbligatorio: env var Vercel può avere trailing whitespace
  const expectedSecret = process.env.ADMIN_API_SECRET?.trim();
  if (!expectedSecret || adminSecret.trim() !== expectedSecret) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Configurazione DB mancante' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Carica dati cliente
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, status')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }

  // 2. Aggiorna tracking in DB
  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      tracking_number: trackingNumber,
      carrier_url:     carrierUrl ?? null,
      status:          'shipped',
    })
    .eq('id', orderId);

  if (updateErr) {
    return NextResponse.json({ error: 'Errore aggiornamento DB', details: updateErr.message }, { status: 500 });
  }

  // 3. Invia email spedizione se cliente ha email
  let emailSent = false;
  if (order.customer_email) {
    try {
      await sendShippingEmail({
        orderId,
        customerEmail:  order.customer_email,
        customerName:   order.customer_name ?? 'Operatore',
        trackingNumber,
        carrierUrl,
        carrier,
        estimatedDays,
      });
      emailSent = true;
    } catch (err) {
      console.error('[ship-order] Email spedizione fallita:', err);
    }
  }

  return NextResponse.json({ success: true, emailSent });
}
