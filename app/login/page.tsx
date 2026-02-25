'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
import Logo from '@/app/components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Credenziali non valide. Riprova.')
      setLoading(false)
      return
    }

    router.push('/admin')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-dark px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo height={56} showText={true} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-text-primary">Area Riservata</h1>
            <p className="text-sm text-text-secondary">Accedi al pannello amministrativo</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-bg-card p-6 shadow-xl"
        >
          {error && (
            <div className="mb-4 rounded-lg border border-badge-red/30 bg-badge-red/10 px-4 py-3 text-sm text-badge-red">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@esempio.com"
              className="w-full rounded-lg border border-border bg-bg-dark px-4 py-3 text-base text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-border bg-bg-dark px-4 py-3 text-base text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-base font-bold text-bg-dark transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Accesso in corso...
              </>
            ) : (
              'Accedi'
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
