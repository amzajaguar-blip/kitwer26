'use client'

import { Menu, X, Search, Sun, Moon } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'

const CATEGORIES = [
  'Mouse', 'Tastiera', 'Monitor 144hz', 'Cuffie',
  'Microfono', 'GPU', 'Stream Deck', 'Webcam',
]

export default function Navbar({ logoUrl }: { logoUrl?: string }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { theme, toggle } = useTheme()

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-dark/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Kitwer26"
                className="h-8 max-w-[140px] object-contain md:h-10"
              />
            ) : (
              <>
                <span className="text-2xl font-bold text-accent">Kitwer26</span>
                <span className="ml-1.5 text-xs font-medium text-text-secondary">GAMING</span>
              </>
            )}
          </Link>

          {/* Desktop Categories */}
          <div className="hidden items-center gap-1 lg:flex">
            {CATEGORIES.slice(0, 5).map((cat) => (
              <Link
                key={cat}
                href={`/?category=${encodeURIComponent(cat)}`}
                className="rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
              >
                {cat}
              </Link>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="rounded-lg p-2 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
              aria-label="Cerca"
            >
              <Search size={20} />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Modalità chiara' : 'Modalità scura'}
              className="rounded-lg p-2 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
            >
              {theme === 'dark'
                ? <Sun size={20} />
                : <Moon size={20} />
              }
            </button>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-lg p-2 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary lg:hidden"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="pb-4">
            <input
              type="text"
              placeholder="Cerca mouse, monitor, tastiere..."
              className="w-full rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-border bg-bg-dark lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/?category=${encodeURIComponent(cat)}`}
                onClick={() => setIsMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-sm text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
