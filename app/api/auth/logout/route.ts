import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 *
 * Cancella il cookie kitwer_vault_session e invalida la sessione admin.
 * Il vecchio handleLogout chiamava supabase.auth.signOut() che non fa nulla
 * perché l'auth admin è custom (vault), non Supabase Auth.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('kitwer_vault_session', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
    maxAge:   0, // scaduto immediatamente
  });
  return res;
}
