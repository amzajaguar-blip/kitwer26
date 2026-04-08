import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/webhooks/tracking
 *
 * Receives tracking updates from external carriers / logistics systems.
 * Auth: Bearer token must match TRACKING_WEBHOOK_SECRET env var.
 *
 * Body: { tracking_number: string, status: string, location?: string }
 *
 * Flow:
 *   1. Validate auth
 *   2. Find order_tracking row by tracking_number
 *   3. Update last_status + last_event_at
 *   4. Insert event into order_tracking_events
 *   5. If status triggers email, queue it (mark event for email worker)
 *   6. Return { ok: true } — never block on email
 */

const EMAIL_TRIGGER_STATUSES = ['shipped', 'out_for_delivery', 'delivered', 'delayed'] as const;

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const secret = process.env.TRACKING_WEBHOOK_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { tracking_number?: string; status?: string; location?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { tracking_number, status, location } = body;
  if (!tracking_number || !status) {
    return NextResponse.json(
      { error: 'Missing required fields: tracking_number, status' },
      { status: 400 },
    );
  }

  // ── Supabase client (service role) ──────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // ── Find tracking row ──────────────────────────────────────────────────────
  const { data: tracking, error: findErr } = await supabase
    .from('order_tracking')
    .select('id, order_id, user_email, last_status')
    .eq('tracking_number', tracking_number)
    .maybeSingle();

  if (findErr) {
    console.error('[webhook/tracking] Supabase find error:', findErr.message);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  if (!tracking) {
    return NextResponse.json(
      { error: `No tracking found for number: ${tracking_number}` },
      { status: 404 },
    );
  }

  // ── Update tracking row ────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('order_tracking')
    .update({
      last_status: status,
      last_event_at: now,
      updated_at: now,
    })
    .eq('id', tracking.id);

  if (updateErr) {
    console.error('[webhook/tracking] Update error:', updateErr.message);
    return NextResponse.json({ error: 'Failed to update tracking' }, { status: 500 });
  }

  // ── Insert event ───────────────────────────────────────────────────────────
  const shouldEmail = (EMAIL_TRIGGER_STATUSES as readonly string[]).includes(status);

  const { error: eventErr } = await supabase
    .from('order_tracking_events')
    .insert({
      tracking_id: tracking.id,
      status: shouldEmail ? `${status}:pending_email` : status,
      location: location ?? null,
    });

  if (eventErr) {
    console.error('[webhook/tracking] Event insert error:', eventErr.message);
    // Non-fatal — tracking was updated, event logging failed
  }

  console.log(
    `[webhook/tracking] Updated ${tracking_number} → ${status}` +
    (shouldEmail ? ' (email queued)' : ''),
  );

  return NextResponse.json({ ok: true });
}
