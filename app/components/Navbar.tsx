'use client'

import { Menu, X, Search } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  'Mouse', 'Tastiera', 'Monitor 144hz', 'Cuffie',
  'Microfono', 'GPU', 'Stream Deck', 'Webcam',
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-dark/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-2xl font-bold text-accent">Kitwer26</span>
            <span className="ml-1.5 text-xs font-medium text-text-secondary">GAMING</span>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="rounded-lg p-2 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
              aria-label="Cerca"
            >
              <Search size={20} />
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
