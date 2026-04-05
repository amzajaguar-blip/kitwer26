import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/track
 *
 * Body: { orderId, email }
 *
 * Verifica email vs ordine (sicurezza server-side).
 * Restituisce stato ordine + amazon_tracking_link per il radar UI.
 * Logica 100% interna — nessuna dipendenza API esterna.
 */

const STATUS_STEP: Record<string, number> = {
  pending:   1,
  confirmed: 2,
  shipped:   3,
  delivered: 5,
  cancelled: 0,
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'ORDINE IN ELABORAZIONE',              color: '#52525b' },
  confirmed: { label: 'ASSET CONFERMATO — PREPARAZIONE',     color: '#22d3ee' },
  shipped:   { label: 'ASSET IN TRANSITO — RETE AMAZON',     color: '#f97316' },
  delivered: { label: 'OBIETTIVO RAGGIUNTO: ASSET ACQUISITO',color: '#22c55e' },
  cancelled: { label: 'ORDINE ANNULLATO',                    color: '#ef4444' },
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { orderId, email } = (body ?? {}) as { orderId?: string; email?: string };

  if (!orderId || !email) {
    return NextResponse.json({ error: 'orderId e email richiesti' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, customer_name, customer_surname, customer_email, amazon_tracking_link, order_items(product_title, quantity)')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: 'Ordine non trovato' }, { status: 404 });
  }

  // Verifica email (case-insensitive)
  if (order.customer_email?.toLowerCase() !== email.trim().toLowerCase()) {
    return NextResponse.json({ error: 'Email non corrispondente' }, { status: 403 });
  }

  const statusInfo = STATUS_LABEL[order.status] ?? { label: order.status.toUpperCase(), color: '#52525b' };
  const step       = STATUS_STEP[order.status] ?? 1;

  return NextResponse.json({
    orderId:             order.id,
    status:              order.status,
    customerName:        `${order.customer_name ?? ''} ${order.customer_surname ?? ''}`.trim(),
    amazonTrackingLink:  order.amazon_tracking_link ?? null,
    step,
    statusLabel:         statusInfo.label,
    statusColor:         statusInfo.color,
    orderItems:          order.order_items ?? [],
    mode:                order.amazon_tracking_link ? 'active' : 'pending',
  });
}
