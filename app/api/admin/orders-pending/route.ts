import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/orders-pending
 *
 * Ritorna:
 *  - orders: ordini confermati (pronti per il dispacciamento) + spediti
 *  - stats:  metriche operative
 *    - pending:       ordini confermati da spedire
 *    - shipped:       ordini spediti questo mese
 *    - revenue:       totale incassato (confirmed + shipped + delivered)
 *    - margin:        revenue * 20%
 *    - stuckPayments: sessioni Stripe avviate e non confermate > 1h (da monitorare)
 */
export async function GET(_req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const now         = new Date();
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const oneHourAgo  = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Ordini confermati (da spedire) + spediti (da segnare consegnati)
  const [
    { data: orders,       error: ordErr },
    { count: shippedCount               },
    { data: revenueData                 },
    { count: stuckCount                 },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at, customer_name, customer_surname, customer_email, total_amount, status, amazon_tracking_link, order_items(product_title, quantity, price_at_purchase, product_url)')
      .in('status', ['confirmed', 'shipped'])
      .order('created_at', { ascending: false })
      .limit(50),

    // Spediti questo mese
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'shipped')
      .gte('created_at', monthStart),

    // Revenue reale: solo ordini effettivamente pagati e confermati
    supabase
      .from('orders')
      .select('total_amount')
      .in('status', ['confirmed', 'shipped', 'delivered']),

    // Sessioni Stripe bloccate (pagamento avviato ma non confermato da > 1h)
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_stripe_payment')
      .lt('created_at', oneHourAgo),
  ]);

  if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 });

  const revenue = (revenueData ?? []).reduce(
    (s: number, o: { total_amount: number }) => s + (o.total_amount ?? 0), 0,
  );
  const margin  = revenue * 0.20;

  const pendingCount = (orders ?? []).filter(o => o.status === 'confirmed').length;

  return NextResponse.json({
    orders: orders ?? [],
    stats: {
      pending:       pendingCount,
      shipped:       shippedCount ?? 0,
      revenue:       Math.round(revenue * 100) / 100,
      margin:        Math.round(margin  * 100) / 100,
      stuckPayments: stuckCount ?? 0,
    },
  });
}
