'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Check, Zap } from 'lucide-react'
import { useCart } from '@/app/context/CartContext'

interface Props {
  productId: string
  title: string
  price: number
  imageUrl?: string
  slug: string
  targetId?: string
  isDirectSell?: boolean
}

export default function StickyBuyBar({
  productId,
  title,
  price,
  imageUrl,
  slug,
  targetId,
  isDirectSell = false,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  useEffect(() => {
    if (!targetId) {
      // Show after scrolling 300px
      const onScroll = () => setVisible(window.scrollY > 300)
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => window.removeEventListener('scroll', onScroll)
    }

    const target = document.getElementById(targetId)
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetId])

  function handleAddToCart() {
    addItem({ id: productId, title, price, image_url: imageUrl, slug })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function scrollToBuy() {
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!visible}
    >
      <div
        className="border-t border-border px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3"
        style={{ background: 'rgba(18,18,26,0.95)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3">
          {/* Price info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-text-secondary">{title}</p>
            <p className="text-lg font-bold text-accent">{price.toFixed(2)}€</p>
          </div>

          {/* Direct buy button (scroll to form) — only for is_direct_sell */}
          {isDirectSell && targetId && (
            <button
              onClick={scrollToBuy}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-bold text-accent transition active:scale-95"
            >
              <Zap size={15} />
              Acquista
            </button>
          )}

          {/* Add to Cart — always visible */}
          <button
            onClick={handleAddToCart}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold shadow-lg transition-all active:scale-95 ${
              added
                ? 'bg-green-500 text-white shadow-green-500/25'
                : 'bg-accent text-bg-dark shadow-accent/25'
            }`}
          >
            {added ? (
              <>
                <Check size={15} />
                Aggiunto!
              </>
            ) : (
              <>
                <ShoppingCart size={15} />
                Carrello
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
