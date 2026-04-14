/**
 * POST /api/admin/revalidate
 * Forza revalidazione cache ISR per Tactical Deals e prodotti.
 * Auth: x-admin-secret header o cookie kitwer_vault_session.
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const VALID_TARGETS = ['deals', 'all'] as const;
type Target = typeof VALID_TARGETS[number];

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) return false;
  if (req.headers.get('x-admin-secret') === secret) return true;
  const cookieStore = await cookies();
  return cookieStore.get('kitwer_vault_session')?.value === secret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  let body: { target?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON non valido' }, { status: 400 }); }

  const target = body?.target as string;
  if (!VALID_TARGETS.includes(target as Target)) {
    return NextResponse.json(
      { error: `target deve essere: ${VALID_TARGETS.join(' | ')}` },
      { status: 422 }
    );
  }

  const revalidated: string[] = [];

  if (target === 'deals' || target === 'all') {
    revalidatePath('/api/deals');
    revalidatePath('/', 'page');
    revalidated.push('/api/deals', '/');
  }

  return NextResponse.json({
    ok: true,
    target,
    revalidated,
    ts: new Date().toISOString(),
  });
}
