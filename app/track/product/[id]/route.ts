import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildAffiliateLink } from '@/lib/affiliate';

/**
 * GET /track/product/[id]
 *
 * Affiliate click-tracking redirect handler.
 *
 * Flow:
 *   1. Read product by ID from Supabase
 *   2. Build affiliate URL via buildAffiliateLink (injects tag=kitwer26-21)
 *   3. Log click to `clicks` table (best-effort — never blocks the redirect)
 *   4. 302 redirect to the affiliate URL
 *
 * If product not found or URL unavailable → 302 to homepage.
 * The clicks table must exist in Supabase (see migration below).
 *
 * SQL to create the clicks table:
 *   CREATE TABLE IF NOT EXISTS public.clicks (
 *     id          bigserial PRIMARY KEY,
 *     product_id  bigint NOT NULL,
 *     created_at  timestamptz NOT NULL DEFAULT now(),
 *     user_agent  text,
 *     ref         text
 *   );
 *   CREATE INDEX IF NOT EXISTS clicks_product_id_idx ON public.clicks (product_id);
 *   CREATE INDEX IF NOT EXISTS clicks_created_at_idx ON public.clicks (created_at DESC);
 */

export const runtime = 'edge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const fallbackUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kitwer26.com';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch product_url
  const { data: product } = await supabase
    .from('products')
    .select('id, product_url')
    .eq('id', id)
    .single();

  // 2. Build affiliate URL
  const affiliateUrl = buildAffiliateLink(product?.product_url ?? null);

  // 3. Log click (best-effort — if clicks table missing, silently skip)
  if (product?.id) {
    const userAgent = req.headers.get('user-agent') ?? null;
    const ref       = req.headers.get('referer') ?? null;
    // Fire-and-forget — do not await, redirect must not be blocked
    void (async () => {
      try {
        await supabase
          .from('clicks')
          .insert({ product_id: product.id, user_agent: userAgent, ref });
      } catch {
        // clicks table may not exist yet — safe to ignore
      }
    })();
  }

  // 4. Redirect
  const destination = affiliateUrl ?? fallbackUrl;
  return NextResponse.redirect(destination, { status: 302 });
}
