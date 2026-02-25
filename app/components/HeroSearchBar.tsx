'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export default function HeroSearchBar({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    startTransition(() => {
      router.push(q ? `/?q=${encodeURIComponent(q)}` : '/')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl">
      <div
        className={[
          'flex items-center gap-3 rounded-2xl border px-5 py-3.5',
          'border-white/10 bg-white/5 backdrop-blur-md',
          'transition-all duration-200',
          'focus-within:border-accent/60 focus-within:bg-white/8 focus-within:shadow-[0_0_0_3px_rgba(255,193,7,0.08)]',
        ].join(' ')}
      >
        <Search size={18} className="shrink-0 text-accent" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Cerca tastiere, microfoni, smart home..."
          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/55 focus:outline-none md:text-base"
          autoComplete="off"
        />
        {value.trim() && (
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-accent px-4 py-1.5 text-sm font-bold text-bg-dark transition-all hover:bg-accent-hover"
          >
            Cerca
          </button>
        )}
      </div>
    </form>
  )
}
