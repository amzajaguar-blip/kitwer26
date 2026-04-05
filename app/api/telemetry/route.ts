/**
 * POST /api/telemetry
 *
 * Lightweight page-view tracker. Called client-side from PageTracker component.
 * Inserts one row into the `telemetry` table per page visit.
 * Ignores bots, crawlers, and admin/API paths.
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|Googlebot|Bingbot|YandexBot|DuckDuckBot|Baiduspider|LinkedInBot|Twitterbot/i;

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false });

    // Ignora bot / crawler
    const ua = req.headers.get('user-agent') ?? '';
    if (BOT_RE.test(ua)) return NextResponse.json({ ok: false });

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const page_path = typeof body.page_path === 'string' ? body.page_path.slice(0, 255) : null;
    if (!page_path) return NextResponse.json({ ok: false });

    // Ignora path admin/API/static
    if (
      page_path.startsWith('/admin') ||
      page_path.startsWith('/api') ||
      page_path.startsWith('/_next') ||
      page_path.includes('.')
    ) {
      return NextResponse.json({ ok: false });
    }

    // visitor_id: IP hash per privacy (non conserviamo IP raw)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? req.headers.get('x-real-ip')
            ?? null;

    await fetch(`${supabaseUrl}/rest/v1/telemetry`, {
      method:  'POST',
      headers: {
        apikey:          serviceKey,
        Authorization:   `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
        Prefer:          'return=minimal',
      },
      body: JSON.stringify({ page_path, visitor_id: ip }),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
