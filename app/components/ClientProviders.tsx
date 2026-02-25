'use client'

import { CartProvider } from '@/app/context/CartContext'
import CartDrawer from '@/app/components/CartDrawer'
import CookieBanner from '@/app/components/CookieBanner'
import { ReactNode } from 'react'

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
      <CookieBanner />
    </CartProvider>
  )
}
