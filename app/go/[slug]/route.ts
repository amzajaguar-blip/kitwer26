import { NextRequest, NextResponse } from 'next/server';
import {
  AFFILIATE_TAG,
  decodeBase64Url,
  ensureTag,
  isAmazonUrl,
} from '@/lib/affiliate';

export const runtime = 'edge';

function sanitizeHeaderValue(value: string | null, maxLength = 256): string {
  if (!value) return '';
  return value.replace(/[\r\n\x00]/g, '').slice(0, maxLength);
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return sanitizeHeaderValue(req.headers.get('x-real-ip'), 64) || 'unknown';
}

function getRateLimitPlaceholder(req: NextRequest): boolean {
  const ip = getClientIp(req);
  return ip.length > 0;
}

function decodeDestination(slug: string): URL | null {
  try {
    const decoded = decodeBase64Url(slug);
    if (!isAmazonUrl(decoded) || !decoded.toLowerCase().includes('amazon')) {
      return null;
    }

    const secured = new URL(ensureTag(decoded));
    if (!secured.hostname.toLowerCase().includes('amazon')) {
      return null;
    }

    if (secured.searchParams.get('tag') !== AFFILIATE_TAG) {
      return null;
    }

    return secured;
  } catch {
    return null;
  }
}

function buildRedirectResponse(destination: URL): NextResponse {
  const response = NextResponse.redirect(destination, 302);
  response.headers.set('x-robots-tag', 'noindex, nofollow, noarchive');
  response.headers.set('referrer-policy', 'no-referrer-when-downgrade');
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('cache-control', 'private, no-store');
  return response;
}

function trackClick(req: NextRequest, destination: URL): void {
  const endpoint = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!endpoint) return;

  const payload = {
    destination: destination.toString(),
    referer: sanitizeHeaderValue(req.headers.get('referer')),
    userAgent: sanitizeHeaderValue(req.headers.get('user-agent'), 512),
    ip: getClientIp(req),
    timestamp: new Date().toISOString(),
  };

  void fetch(`${endpoint.replace(/\/+$/g, '')}/api/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page_path: '/go', affiliate_click: payload }),
  }).catch(() => {});
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const destination = decodeDestination(slug);

  if (!destination || !getRateLimitPlaceholder(req)) {
    return NextResponse.json({ error: 'Invalid affiliate destination.' }, { status: 400 });
  }

  trackClick(req, destination);
  return buildRedirectResponse(destination);
}
