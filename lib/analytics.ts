import { supabase } from './supabase'

interface AnalyticsEvent {
  event_type: 'page_view' | 'click_buy'
  product_slug: string
  product_title: string
  product_id?: string
}

async function track(event: AnalyticsEvent) {
  await supabase.from('analytics').insert({
    event_type: event.event_type,
    product_slug: event.product_slug,
    product_title: event.product_title,
    product_id: event.product_id ?? null,
  })
}

export function trackPageView(productSlug: string, productTitle: string, productId?: string) {
  return track({ event_type: 'page_view', product_slug: productSlug, product_title: productTitle, product_id: productId })
}

export function trackBuyClick(productSlug: string, productTitle: string, productId?: string) {
  return track({ event_type: 'click_buy', product_slug: productSlug, product_title: productTitle, product_id: productId })
}
