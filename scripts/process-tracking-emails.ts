/**
 * scripts/process-tracking-emails.ts
 *
 * Email queue worker for tracking update notifications.
 * Reads pending tracking events (status ending with :pending_email),
 * renders the TrackingUpdate email template, sends via Resend,
 * and marks events as processed.
 *
 * Run manually: npx tsx scripts/process-tracking-emails.ts
 * Or via cron job.
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                    RESEND_API_KEY, FROM_EMAIL
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import { TrackingUpdate } from '../emails/tracking-update';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL
  ? `Kitwer26 <${process.env.FROM_EMAIL.trim()}>`
  : 'Kitwer26 <info@kitwer26.com>';

const STATUS_SUBJECTS: Record<string, string> = {
  shipped: '🚀 Il tuo ordine e\' stato spedito!',
  in_transit: '📦 Il tuo ordine e\' in transito',
  out_for_delivery: '🛵 In consegna oggi!',
  delivered: '✅ Ordine consegnato!',
  delayed: '⚠️ Ritardo nella consegna',
};

async function getCrossSellProducts() {
  const { data } = await supabase
    .from('products')
    .select('name, price, slug')
    .eq('is_active', true)
    .gt('price', 0)
    .order('price', { ascending: false })
    .limit(2);

  return (data ?? []).map((p) => ({
    name: p.name,
    price: p.price,
    url: `https://kitwer26.com/product/${p.slug}`,
  }));
}

async function main() {
  console.log('[tracking-emails] Starting email queue processing...');

  // Find events with pending_email status
  const { data: events, error } = await supabase
    .from('order_tracking_events')
    .select(`
      id,
      status,
      location,
      tracking_id,
      order_tracking!inner (
        order_id,
        user_email,
        tracking_number,
        carrier_code
      )
    `)
    .like('status', '%:pending_email')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[tracking-emails] Query error:', error.message);
    process.exit(1);
  }

  if (!events || events.length === 0) {
    console.log('[tracking-emails] No pending emails. Done.');
    return;
  }

  console.log(`[tracking-emails] Found ${events.length} pending email(s)`);

  const crossSellProducts = await getCrossSellProducts();

  let sent = 0;
  let failed = 0;

  for (const event of events) {
    const tracking = event.order_tracking as unknown as {
      order_id: string;
      user_email: string;
      tracking_number: string;
      carrier_code: string;
    };

    // Extract real status from "shipped:pending_email" → "shipped"
    const realStatus = (event.status ?? '').replace(':pending_email', '');
    const subject = STATUS_SUBJECTS[realStatus] ?? `Aggiornamento ordine #${tracking.order_id.slice(0, 8).toUpperCase()}`;

    try {
      const html = await render(
        TrackingUpdate({
          orderId: tracking.order_id,
          customerName: tracking.user_email.split('@')[0],
          status: realStatus,
          trackingNumber: tracking.tracking_number,
          carrierCode: tracking.carrier_code,
          crossSellProducts,
        }),
      );

      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to: tracking.user_email,
        subject,
        html,
      });

      if (sendErr) {
        console.error(`[tracking-emails] Send failed for event ${event.id}:`, sendErr);
        failed++;
        continue;
      }

      // Mark as sent
      await supabase
        .from('order_tracking_events')
        .update({ status: `${realStatus}:email_sent` })
        .eq('id', event.id);

      sent++;
      console.log(`[tracking-emails] Sent ${realStatus} email to ${tracking.user_email}`);
    } catch (err) {
      console.error(`[tracking-emails] Error processing event ${event.id}:`, err);
      failed++;
    }
  }

  console.log(`[tracking-emails] Done. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error('[tracking-emails] Fatal error:', err);
  process.exit(1);
});
