'use client'

import { Menu, X, Search, Sun, Moon, ShoppingCart } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import { useCart } from '@/app/context/CartContext'

const CATEGORIES = [
  'Mouse', 'Tastiera', 'Monitor 144hz', 'Cuffie',
  'Microfono', 'GPU', 'Stream Deck', 'Webcam',
]

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const { itemCount, openDrawer } = useCart()

  return (
    <nav className="navbar-always-dark sticky top-0 z-50 border-b border-border backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-[72px] items-center justify-between">
          {/* Logo */}
          <Link href="/" aria-label="Kitwer26 — Homepage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://layehkivpxlscamgfive.supabase.co/storage/v1/object/public/logos/logo1-removebg-preview.png"
              alt="Kitwer26"
              className="h-12 w-12 cursor-pointer object-contain"
            />
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
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Cart icon */}
            <button
              onClick={openDrawer}
              className="relative rounded-lg p-2 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
              aria-label={`Carrello${itemCount > 0 ? ` (${itemCount} articoli)` : ''}`}
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-bg-dark">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
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
