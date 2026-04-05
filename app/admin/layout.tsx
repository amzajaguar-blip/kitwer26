import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Server Component — doppia rete di sicurezza dopo il middleware.
 *
 * Il middleware è il guardiano primario. Questo layout è il fallback:
 * se per qualsiasi motivo (bug, edge-case di Next.js, bypass) il middleware
 * lascia passare una richiesta non autenticata, questo blocco rimanda al login.
 *
 * Usa l'header `x-pathname` iniettato dal middleware per escludere
 * la pagina di login dal controllo (evita loop infiniti).
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname    = headersList.get('x-pathname') ?? '';

  // La pagina di login è pubblica: salta il controllo per evitare redirect loop.
  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  const cookieStore    = await cookies();
  const sessionCookie  = cookieStore.get('kitwer_vault_session')?.value;
  const secret         = process.env.ADMIN_API_SECRET?.trim();

  // ── Controllo server-side ─────────────────────────────────────────────────
  if (!secret || !sessionCookie || sessionCookie.trim() !== secret) {
    console.warn(`[ADMIN LAYOUT] Sessione non valida per "${pathname}" — redirect al login`);
    redirect('/admin/login?error=unauthorized');
  }

  return <>{children}</>;
}
