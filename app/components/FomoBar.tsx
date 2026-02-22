'use client'

import { useState, useEffect } from 'react'

interface Props {
  productId: string
}

export default function FomoBar({ productId }: Props) {
  const [viewers, setViewers] = useState<number | null>(null)
  const [stock, setStock] = useState<number | null>(null)

  useEffect(() => {
    // Seed deterministico per product_id: stesso numero per sessione, diverso per prodotto
    const seed = productId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    setViewers((seed % 8) + 2)   // 2–9
    setStock((seed % 3) + 1)     // 1–3
  }, [productId])

  if (viewers === null) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2.5 rounded-xl border border-orange-500/25 bg-orange-500/8 px-3 py-2.5">
        <span className="text-base">🔥</span>
        <p className="text-xs font-medium text-orange-400">
          <span className="font-bold">{viewers} persone</span> stanno guardando questo prodotto in questo momento
        </p>
      </div>
      <div className="flex items-center gap-2.5 rounded-xl border border-badge-red/25 bg-badge-red/8 px-3 py-2.5">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-badge-red opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-badge-red" />
        </span>
        <p className="text-xs font-medium text-badge-red">
          Solo <span className="font-bold">{stock} {stock === 1 ? 'pezzo rimasto' : 'pezzi rimasti'}</span> a questo prezzo!
        </p>
      </div>
    </div>
  )
}
