import { NextRequest, NextResponse } from 'next/server';
import { audit, auditError } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password, token } = body as Record<string, string>;

    const adminEmail    = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminToken    = process.env.ADMIN_API_SECRET;

    // ── HARD LOG Step 1: verifica configurazione env vars ─────────────────────
    console.log('[VAULT] Step 1 - Env vars:', {
      hasEmail:    !!adminEmail,
      hasPassword: !!adminPassword,
      hasToken:    !!adminToken,
      emailLen:    adminEmail?.length    ?? 0,
      passwordLen: adminPassword?.length ?? 0,
      tokenLen:    adminToken?.length    ?? 0,
    });

    if (!adminEmail || !adminPassword || !adminToken) {
      auditError('auth.config.missing', { source: 'vault', reason: 'ADMIN_credentials_env_missing' });
      return NextResponse.json({ error: 'Server non configurato' }, { status: 500 });
    }

    // .trim() su TUTTO: sia input utente che env vars.
    // Difende da whitespace/newline accidentali (copy-paste su Vercel è la causa #1 di mismatch).
    const inputEmail    = (email    ?? '').trim();
    const inputPassword = (password ?? '').trim();
    const inputToken    = (token    ?? '').trim();
    const envEmail      = adminEmail.trim();
    const envPassword   = adminPassword.trim();
    const envToken      = adminToken.trim();

    // ── HARD LOG Step 2: confronto credenziali (senza esporre i valori) ──────
    console.log('[VAULT] Step 2 - Confronto:', {
      emailMatch:       inputEmail    === envEmail,
      passwordMatch:    inputPassword === envPassword,
      tokenMatch:       inputToken    === envToken,
      inputEmailLen:    inputEmail.length,
      envEmailLen:      envEmail.length,
      inputPasswordLen: inputPassword.length,
      envPasswordLen:   envPassword.length,
      inputTokenLen:    inputToken.length,
      envTokenLen:      envToken.length,
    });

    const valid = inputEmail === envEmail && inputPassword === envPassword && inputToken === envToken;

    if (!valid) {
      auditError('auth.login.failed', { source: 'vault', reason: 'credentials_mismatch' });
      console.warn('[VAULT] Login FALLITO - credenziali non corrispondono');
      await new Promise(r => setTimeout(r, 600));
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    // ── HARD LOG Step 3: login OK, scrittura cookie ───────────────────────────
    console.log('[VAULT] Step 3 - Credenziali OK. Imposto cookie kitwer_vault_session...');
    audit('auth.login.success', { source: 'vault' });

    // Cookie = envToken (già trimmato) per garantire coerenza con il middleware.
    const res = NextResponse.json({ ok: true });
    res.cookies.set('kitwer_vault_session', envToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24, // 24h
    });

    // ── HARD LOG Step 4: conferma set-cookie header ───────────────────────────
    const setCookieHeader = res.headers.get('set-cookie') ?? '';
    console.log('[VAULT] Step 4 - set-cookie header:', setCookieHeader.substring(0, 80) + '...');

    return res;

  } catch (err) {
    console.error('[VAULT CRASH]', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
