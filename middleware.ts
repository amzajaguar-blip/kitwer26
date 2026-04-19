import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];
const CACHEABLE_PREFIXES = [
  '/cyber-security',
  '/fpv-drones',
  '/sim-racing',
  '/crypto-wallets',
] as const;
const STATIC_FILE_RE = /\.(?:avif|css|gif|ico|jpg|jpeg|js|map|png|svg|txt|webp|xml)$/i;
const BOT_RE = /\b(bot|crawler|spider|headless|preview)\b/i;
const TRUSTED_BOT_RE = /\b(Googlebot|AdsBot-Google|Google-InspectionTool|Bingbot)\b/i;
const AFFILIATE_ROUTES = ['/go', '/track'];

function isStaticAsset(pathname: string): boolean {
  return pathname.startsWith('/_next/') || STATIC_FILE_RE.test(pathname);
}

function isCacheableCategory(pathname: string): boolean {
  return CACHEABLE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

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

function getBotScore(req: NextRequest): { score: number; trusted: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const userAgent = sanitizeHeaderValue(req.headers.get('user-agent'), 512);
  const accept = sanitizeHeaderValue(req.headers.get('accept'));
  const acceptLanguage = sanitizeHeaderValue(req.headers.get('accept-language'));
  const secFetchSite = sanitizeHeaderValue(req.headers.get('sec-fetch-site'));
  const secFetchMode = sanitizeHeaderValue(req.headers.get('sec-fetch-mode'));
  const method = req.method.toUpperCase();

  const trusted = TRUSTED_BOT_RE.test(userAgent);
  let score = 0;

  if (BOT_RE.test(userAgent)) {
    score += trusted ? 1 : 4;
    reasons.push(trusted ? 'trusted-ua' : 'bot-ua');
  }

  if (!userAgent) {
    score += 3;
    reasons.push('missing-ua');
  }

  if (!accept) {
    score += 2;
    reasons.push('missing-accept');
  }

  if (method === 'GET' && !acceptLanguage) {
    score += trusted ? 0 : 2;
    reasons.push('missing-accept-language');
  }

  if (!secFetchSite && !secFetchMode) {
    score += trusted ? 0 : 1;
    reasons.push('missing-fetch-metadata');
  }

  if (req.nextUrl.searchParams.has('__prerender_bypass') || req.nextUrl.searchParams.has('_escaped_fragment_')) {
    score += 2;
    reasons.push('preview-flag');
  }

  if (req.nextUrl.pathname.startsWith('/api/') && BOT_RE.test(userAgent)) {
    score += 2;
    reasons.push('api-bot');
  }

  return { score, trusted, reasons };
}

function attachStandardHeaders(
  response: NextResponse,
  req: NextRequest,
  pathname: string,
  botInfo?: { score: number; reasons: string[]; trusted: boolean },
): NextResponse {
  response.headers.set('x-pathname', pathname);
  response.headers.set('x-rate-limit-placeholder', getClientIp(req));
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('x-frame-options', 'SAMEORIGIN');

  if (botInfo) {
    response.headers.set('x-bot-score', String(botInfo.score));
    response.headers.set('x-bot-reasons', botInfo.reasons.join(',') || 'none');
    if (botInfo.trusted) {
      response.headers.set('x-bot-trusted', 'true');
    }
  }

  if (!response.headers.has('cache-control') && isCacheableCategory(pathname)) {
    response.headers.set(
      'cache-control',
      'public, s-maxage=600, stale-while-revalidate=86400',
    );
  }

  return response;
}

function handleAdminAuth(req: NextRequest, requestHeaders: Headers): NextResponse | null {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return null;
  }

  if (PUBLIC_ADMIN_PATHS.some((publicPath) => pathname.startsWith(publicPath))) {
    return attachStandardHeaders(NextResponse.next({ request: { headers: requestHeaders } }), req, pathname);
  }

  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) {
    return NextResponse.redirect(new URL('/admin/login?error=missing_secret', req.url));
  }

  const cookieVal = req.cookies.get('kitwer_vault_session')?.value?.trim();
  if (!cookieVal) {
    return NextResponse.redirect(new URL('/admin/login?error=unauthorized', req.url));
  }

  if (cookieVal !== secret) {
    return NextResponse.redirect(new URL('/admin/login?error=session_expired', req.url));
  }

  return attachStandardHeaders(NextResponse.next({ request: { headers: requestHeaders } }), req, pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  const adminResponse = handleAdminAuth(req, requestHeaders);
  if (adminResponse) {
    return adminResponse;
  }

  const isBotBypassPath =
    pathname === '/bot-light' ||
    pathname.startsWith('/bot-light/') ||
    AFFILIATE_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!isBotBypassPath) {
    const botInfo = getBotScore(req);
    const shouldRewriteToBotLight = !botInfo.trusted && botInfo.score >= 4;

    if (shouldRewriteToBotLight) {
      const rewriteUrl = req.nextUrl.clone();
      rewriteUrl.pathname = '/bot-light';
      rewriteUrl.search = '';

      const rewritten = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
      rewritten.headers.set('x-bot-detected', 'true');
      rewritten.headers.set('cache-control', 'public, max-age=300');

      return attachStandardHeaders(rewritten, req, pathname, botInfo);
    }

    return attachStandardHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      req,
      pathname,
      botInfo,
    );
  }

  return attachStandardHeaders(NextResponse.next({ request: { headers: requestHeaders } }), req, pathname);
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|icon.png|robots.txt|sitemap.xml).*)',
    '/api/admin/:path*',
  ],
};
