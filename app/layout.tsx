import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { InternationalizationProvider } from '@/context/InternationalizationContext';

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
  title: 'Kitwer26 — Protocolli di Sicurezza Digitale',
  description:
    'Kitwer26 è il tuo bunker digitale: scopri le migliori soluzioni per la sicurezza informatica, protezione crypto, setup da gaming professionale e sistemi di continuità energetica. Testiamo equipaggiamento tattico di alto livello per proteggere la tua libertà digitale. Esplora i nostri bundle esclusivi.',
  keywords: 'hardware wallet, ledger, trezor, sicurezza digitale, crypto, sim racing, setup gaming, faraday bag, yubikey, Italia',
  openGraph: {
    title: 'Kitwer26 — Protocolli di Sicurezza Digitale',
    description: 'Equipaggiamento tattico per la tua sicurezza digitale. Hardware wallet, privacy tools, sim racing, bundle esclusivi.',
    siteName: 'Kitwer26',
    locale: 'it_IT',
    type: 'website',
  },
  icons: {
    icon: '/LOGOKITWER.png',
    apple: '/LOGOKITWER.png',
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
      </head>
      <body>
        <InternationalizationProvider>
          <ThemeProvider>
            <CartProvider>{children}</CartProvider>
          </ThemeProvider>
        </InternationalizationProvider>

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
