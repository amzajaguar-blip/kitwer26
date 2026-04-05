import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;

    // Inietta il pathname come header per i Server Components (es. admin/layout.tsx)
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-pathname', pathname);

    if (PUBLIC_ADMIN_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // ── HARD LOG ──────────────────────────────────────────────────────────────
    console.log(`[MW] ${req.method} ${pathname}`);

    // .trim() CRITICO: l'env var su Vercel può avere whitespace/newline da copy-paste
    const secret = process.env.ADMIN_API_SECRET?.trim();

    if (!secret) {
      console.error('[MW] CRITICO: ADMIN_API_SECRET mancante o vuoto nel contesto Edge Runtime');
      return NextResponse.redirect(new URL('/admin/login?error=missing_secret', req.url));
    }

    const cookieVal = req.cookies.get('kitwer_vault_session')?.value;

    // ── HARD LOG: stato cookie ────────────────────────────────────────────────
    console.log(`[MW] Cookie presente: ${!!cookieVal} | cookieLen: ${cookieVal?.length ?? 0} | secretLen: ${secret.length}`);

    if (!cookieVal) {
      console.warn(`[MW] Accesso NEGATO (no cookie): ${pathname}`);
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', req.url));
    }

    const match = cookieVal.trim() === secret;

    // ── HARD LOG: risultato confronto ─────────────────────────────────────────
    console.log(`[MW] Confronto cookie===secret: ${match} | cookieTrimLen: ${cookieVal.trim().length} | secretLen: ${secret.length}`);

    if (!match) {
      console.warn(`[MW] Accesso NEGATO (session mismatch): ${pathname}`);
      return NextResponse.redirect(new URL('/admin/login?error=session_expired', req.url));
    }

    console.log(`[MW] Accesso AUTORIZZATO: ${pathname}`);
    return NextResponse.next({ request: { headers: requestHeaders } });

  } catch (err) {
    console.error('[MIDDLEWARE CRASH]', err);
    return NextResponse.redirect(new URL('/admin/login?error=middleware_crash', req.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
