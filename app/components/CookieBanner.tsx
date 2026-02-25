'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const STORAGE_KEY = 'k26-cookie-consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) setVisible(true)
    } catch {
      // localStorage non disponibile (SSR guard)
    }
  }, [])

  if (!visible) return null

  const accept = (type: 'all' | 'essential') => {
    try {
      localStorage.setItem(STORAGE_KEY, type)
    } catch {
      // ignore
    }
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Preferenze cookie"
      className="fixed bottom-0 left-0 right-0 z-[90] px-3 pb-3 pt-0 sm:px-4 sm:pb-4"
    >
      <div className="mx-auto flex max-h-[20vh] max-w-3xl items-center gap-3 overflow-hidden rounded-2xl border border-border bg-bg-card/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-md sm:gap-4 sm:p-4">
        {/* Testo */}
        <p className="min-w-0 flex-1 text-xs leading-snug text-text-secondary sm:text-sm">
          Utilizziamo i cookie per far funzionare il carrello e migliorare la tua esperienza.{' '}
          <a
            href="/privacy"
            className="underline underline-offset-2 transition hover:text-accent"
          >
            Privacy Policy
          </a>
        </p>

        {/* Bottoni */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => accept('essential')}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:border-accent/40 hover:text-text-primary sm:px-4 sm:py-2 sm:text-sm"
            aria-label="Accetta solo cookie essenziali"
          >
            Solo Essenziali
          </button>

          <button
            onClick={() => accept('all')}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-bg-dark shadow-md shadow-accent/20 transition hover:bg-accent-hover active:scale-95 sm:px-4 sm:py-2 sm:text-sm"
            aria-label="Accetta tutti i cookie"
          >
            Accetta Tutti
          </button>

          {/* Tasto chiudi (mobile) */}
          <button
            onClick={() => accept('essential')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:text-text-primary sm:hidden"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
