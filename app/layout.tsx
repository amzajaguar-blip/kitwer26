import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { InternationalizationProvider } from '@/context/InternationalizationContext';
import TacticalSupportBot from '@/components/TacticalSupportBot';

// ── Fonts ────────────────────────────────────────────────────────────────────
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const ADSENSE_ID = process.env.NEXT_PUBLIC_ADSENSE_ID ?? '';

// ── SEO ──────────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://kitwer26.com'),
  title: 'Kitwer26 | Hardware Tattico & Sicurezza Digitale',
  description:
    'Kitwer26 è il tuo bunker digitale: scopri le migliori soluzioni per la sicurezza informatica, protezione crypto, setup da gaming professionale e sistemi di continuità energetica. Testiamo equipaggiamento tattico di alto livello per proteggere la tua libertà digitale. Esplora i nostri bundle esclusivi.',
  keywords: 'hardware wallet, ledger, trezor, sicurezza digitale, crypto, sim racing, setup gaming, faraday bag, yubikey, Italia',
  openGraph: {
    title: 'Kitwer26 | Hardware Tattico & Sicurezza Digitale',
    description: 'Equipaggiamento tattico per la tua sicurezza digitale. Hardware wallet, privacy tools, sim racing, bundle esclusivi.',
    siteName: 'Kitwer26',
    url: 'https://kitwer26.com',
    locale: 'it_IT',
    type: 'website',
    images: [{ url: '/LOGOKITWER.png', width: 512, height: 512, alt: 'Kitwer26' }],
  },
  twitter: {
    card: 'summary',
    title: 'Kitwer26 | Hardware Tattico & Sicurezza Digitale',
    description: 'Equipaggiamento tattico per la tua sicurezza digitale.',
    images: ['/LOGOKITWER.png'],
  },
  icons: {
    // ── Favicon standard (Google richiede multipli di 48px) ───────────────
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    // ── Shortcut legacy (.ico fallback per browser datati) ────────────────
    shortcut: [{ url: '/favicon.ico' }],
    // ── Apple Touch Icon (iOS home screen, 180×180 richiesto da Apple) ────
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  robots: { index: true, follow: true },
  ...(ADSENSE_ID && {
    other: { 'google-adsense-account': ADSENSE_ID },
  }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Force dark class always — Cyber-Bunker is dark-only
    <html lang="it" className={`dark ${jetbrainsMono.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-flash: always dark */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('dark');`,
          }}
        />
        {/* ── Favicon — forzatura esplicita per Google Search Crawler ────────
            Next.js genera i <link> dai metadata.icons, ma dichiararli anche
            qui in modo hardcoded garantisce che Google li indicizzi subito.
            Requisito ufficiale Google: quadrata, multiplo di 48px (192×192). */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body>
        <InternationalizationProvider>
          <ThemeProvider>
            <CartProvider>{children}</CartProvider>
          </ThemeProvider>
        </InternationalizationProvider>
        <TacticalSupportBot />

        {ADSENSE_ID && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
