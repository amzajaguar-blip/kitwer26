'use client'

import { useEffect, useState } from 'react'

interface Props {
  title: string
  price: number
  targetId: string
}

export default function StickyBuyBar({ title, price, targetId }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetId])

  function scrollToBuy() {
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    /* hidden su desktop, visibile mobile solo quando il form è fuori viewport */
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!visible}
    >
      {/* glassmorphism bar */}
      <div
        className="border-t border-border px-4 pb-[env(safe-area-inset-bottom,16px)] pt-3"
        style={{ background: 'rgba(26,26,36,0.92)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-text-secondary">{title}</p>
            <p className="text-xl font-bold text-accent">{price.toFixed(2)}€</p>
          </div>
          <button
            onClick={scrollToBuy}
            className="shrink-0 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-bg-dark shadow-lg shadow-accent/25 transition-transform active:scale-95"
          >
            Acquista →
          </button>
        </div>
      </div>
    </div>
  )
}
