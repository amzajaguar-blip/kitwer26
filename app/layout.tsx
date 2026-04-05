import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { InternationalizationProvider } from '@/context/InternationalizationContext';
import TacticalSupportBot from '@/components/TacticalSupportBot';
import StructuredData from '@/components/StructuredData';
import PageTracker from '@/components/PageTracker';

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
  title: {
    default:  'Kitwer26 | Hardware Tattico & Sicurezza Digitale',
    template: '%s | Kitwer26',
  },
  description:
    'Kitwer26 è il tuo bunker digitale: scopri le migliori soluzioni per la sicurezza informatica, protezione crypto, setup da gaming professionale e sistemi di continuità energetica.',
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
    card: 'summary_large_image',
    title: 'Kitwer26 | Hardware Tattico & Sicurezza Digitale',
    description: 'Equipaggiamento tattico per la tua sicurezza digitale.',
    images: ['/LOGOKITWER.png'],
  },
  icons: {
    icon:  [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/icon.png', sizes: '180x180', type: 'image/png' }],
  },
  alternates: {
    canonical: 'https://kitwer26.com',
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: {
      index:               true,
      follow:              true,
      'max-image-preview': 'large',
      'max-snippet':       -1,
      'max-video-preview': -1,
    },
  },
  ...(ADSENSE_ID && {
    other: { 'google-adsense-account': ADSENSE_ID },
  }),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`dark ${jetbrainsMono.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Anti-flash: forza dark prima che React idrati */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('dark');`,
          }}
        />
        {/* ── JSON-LD Digital Passport ──────────────────────────────────── */}
        <StructuredData />
      </head>
      <body>
        <InternationalizationProvider>
          <ThemeProvider>
            <CartProvider>{children}</CartProvider>
          </ThemeProvider>
        </InternationalizationProvider>
        <PageTracker />
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
