import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDebriefingEmail } from '@/lib/email';

/**
 * GET /api/cron/follow-up
 *
 * Invia email di debriefing agli ordini consegnati con follow_up_at <= now.
 * Configurare su Vercel Cron (vercel.json) ogni ora:
 *
 *   "crons": [{ "path": "/api/cron/follow-up", "schedule": "0 * * * *" }]
 *
 * Protetta da CRON_SECRET header (Vercel la imposta automaticamente).
 */
export async function GET(req: NextRequest) {
  // Vercel imposta Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  // BUG FIX: `if (cronSecret && ...)` saltava il check quando CRON_SECRET non era impostato.
  // Corretto: blocca se CRON_SECRET manca OPPURE se l'header non corrisponde.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[cron/follow-up] Accesso negato — CRON_SECRET mancante o header non valido');
    return new NextResponse(null, { status: 404 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Trova ordini pronti per il follow-up
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_email, follow_up_at')
    .eq('status', 'delivered')
    .eq('follow_up_sent', false)
    .lte('follow_up_at', new Date().toISOString())
    .not('customer_email', 'is', null)
    .limit(20);

  if (error) {
    console.error('[cron/follow-up] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const order of orders ?? []) {
    try {
      await sendDebriefingEmail({
        customerEmail: order.customer_email,
        customerName:  order.customer_name ?? 'Operatore',
        orderId:       order.id,
        reviewUrl:     `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kitwer26.com'}/track/${order.id}`,
      });

      await supabase
        .from('orders')
        .update({ follow_up_sent: true })
        .eq('id', order.id);

      sent++;
      console.log(`[cron/follow-up] Debriefing inviato → ${order.customer_email}`);
    } catch (err) {
      console.error(`[cron/follow-up] Fallito per ordine ${order.id}:`, err);
    }
  }

  return NextResponse.json({ processed: orders?.length ?? 0, sent });
}
