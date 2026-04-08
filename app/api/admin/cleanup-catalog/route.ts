/**
 * POST /api/admin/cleanup-catalog
 *
 * Esegue la pulizia del catalogo prodotti.
 * Auth: header x-admin-secret OPPURE cookie kitwer_vault_session.
 *
 * Body JSON: { dryRun?: boolean }
 * Response:  { success: boolean, logs: CleanupLog[], stats: CleanupStats }
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies }                   from 'next/headers';
import { runCleanup }                from '@/scripts/cleanup-catalog';

export const runtime = 'nodejs';

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const secret      = process.env.ADMIN_API_SECRET?.trim();
  const headerToken = req.headers.get('x-admin-secret')?.trim();
  if (secret && headerToken === secret) return true;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('kitwer_vault_session')?.value?.trim();
  return !!(secret && cookieToken === secret);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let dryRun = false;
  try {
    const body = await req.json() as { dryRun?: boolean };
    dryRun = body.dryRun === true;
  } catch { /* body assente o non-JSON — default dryRun=false */ }

  try {
    const result = await runCleanup(dryRun);
    return NextResponse.json({ success: true, logs: result.logs, stats: result.stats });
  } catch (e) {
    console.error('[cleanup-catalog] errore non gestito:', e);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 },
    );
  }
}
