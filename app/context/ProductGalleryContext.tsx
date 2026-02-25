'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface GalleryCtx {
  activeIndex: number
  setActiveIndex: (i: number) => void
}

const ProductGalleryContext = createContext<GalleryCtx | null>(null)

export function ProductGalleryProvider({ children }: { children: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0)
  return (
    <ProductGalleryContext.Provider value={{ activeIndex, setActiveIndex }}>
      {children}
    </ProductGalleryContext.Provider>
  )
}

export function useGalleryIndex(): GalleryCtx | null {
  return useContext(ProductGalleryContext)
}
