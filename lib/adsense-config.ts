// Google AdSense Configuration
// Incolla qui il tuo client-id quando ricevi l'approvazione da Google
export const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? ''

// Slot IDs per posizione
export const AD_SLOTS = {
  topBar: process.env.NEXT_PUBLIC_AD_SLOT_TOP_BAR ?? '',
  productInline: process.env.NEXT_PUBLIC_AD_SLOT_PRODUCT_INLINE ?? '',
  sidebar: process.env.NEXT_PUBLIC_AD_SLOT_SIDEBAR ?? '',
} as const

export function isAdsenseEnabled(): boolean {
  return ADSENSE_CLIENT_ID.length > 0
}
