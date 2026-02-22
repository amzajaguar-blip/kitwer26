'use client'

import { useEffect } from 'react'
import { trackPageView } from '@/lib/analytics'

interface Props {
  productSlug: string
  productTitle: string
  productId: string
}

export default function ProductAnalyticsTracker({ productSlug, productTitle, productId }: Props) {
  useEffect(() => {
    trackPageView(productSlug, productTitle, productId)
  }, [productSlug, productTitle, productId])

  return null
}
