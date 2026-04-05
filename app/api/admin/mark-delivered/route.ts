import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const Schema = z.object({ orderId: z.string().min(1) });

/**
 * POST /api/admin/mark-delivered
 *
 * Segna l'ordine come consegnato e imposta il timestamp
 * per il follow-up automatico (now + 48 ore).
 */
export async function POST(req: NextRequest) {
  // Autenticazione gestita dal middleware — cookie kitwer_vault_session
  const body   = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'orderId richiesto' }, { status: 400 });
  }

  const { orderId } = parsed.data;
  const supabase    = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const followUpAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('orders')
    .update({ status: 'delivered', follow_up_at: followUpAt, follow_up_sent: false })
    .eq('id', orderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, followUpAt });
}
