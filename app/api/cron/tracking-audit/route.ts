import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/cron/tracking-audit
 *
 * Finds stale shipments: orders where last_event_at is older than 24 hours
 * and status is not delivered or cancelled.
 *
 * Configured in vercel.json cron — runs every 12 hours.
 * Protected by CRON_SECRET (Vercel sets it automatically).
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[cron/tracking-audit] Unauthorized');
    return new NextResponse(null, { status: 404 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: stale, error } = await supabase
    .from('order_tracking')
    .select('id, order_id, user_email, carrier_code, tracking_number, last_status, last_event_at')
    .lt('last_event_at', cutoff)
    .not('last_status', 'in', '("delivered","cancelled")')
    .order('last_event_at', { ascending: true });

  if (error) {
    console.error('[cron/tracking-audit] Query error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const count = stale?.length ?? 0;
  const checkedAt = new Date().toISOString();

  if (count > 0) {
    console.warn(`[cron/tracking-audit] Found ${count} stale shipments:`);
    for (const s of stale!) {
      console.warn(
        `  - Order ${s.order_id} | ${s.carrier_code} ${s.tracking_number} | ` +
        `Status: ${s.last_status} | Last event: ${s.last_event_at}`,
      );
    }
  } else {
    console.log('[cron/tracking-audit] No stale shipments found.');
  }

  return NextResponse.json({ stale_shipments: count, checked_at: checkedAt });
}
