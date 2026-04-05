import { MetadataRoute } from 'next';

/**
 * PWA Web App Manifest — Next.js App Router convention.
 * Servito automaticamente su /manifest.webmanifest.
 * Soddisfa: Chrome Install Banner, Android homescreen, Samsung Browser,
 * macOS Safari "Add to Dock", Google Lighthouse PWA audit.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'KITWER26 — Elite Security Protocols & Tactical Assets',
    short_name:       'KITWER26',
    description:
      'Professional-grade tactical hardware, stealth technology, and high-precision security solutions for global operations.',
    start_url:        '/',
    scope:            '/',
    display:          'standalone',
    orientation:      'portrait-primary',
    background_color: '#050505',
    theme_color:      '#000000',
    lang:             'en',
    categories:       ['shopping', 'security', 'technology'],
    icons: [
      // Android Chrome homescreen (minimo richiesto per install banner)
      {
        src:     '/icon.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icon.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'maskable',
      },
      // Splash screen / alta risoluzione
      {
        src:     '/icon.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icon.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
