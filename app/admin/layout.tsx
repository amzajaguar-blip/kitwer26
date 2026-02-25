import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // Read-only in Server Components — middleware handles refresh
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      {/* Admin top bar */}
      <div className="flex items-center justify-between border-b border-border bg-bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <a href="/admin/dashboard" className="text-xs font-semibold text-accent transition hover:text-accent-hover">
            Dashboard
          </a>
          <span className="text-border">|</span>
          <a href="/admin" className="text-xs text-text-secondary transition hover:text-text-primary">
            Prodotti
          </a>
          <a href="/admin/storefront" className="text-xs text-text-secondary transition hover:text-text-primary">
            Aspetto
          </a>
          <a href="/admin/orders" className="text-xs text-text-secondary transition hover:text-text-primary">
            Ordini
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">{user.email}</span>
          <a
            href="/api/auth/logout"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-badge-red/50 hover:text-badge-red"
          >
            Esci
          </a>
        </div>
      </div>
      {children}
    </div>
  )
}
