import type { Metadata } from 'next'
import { ThemeProvider } from './components/ThemeProvider'
import ClientProviders from './components/ClientProviders'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kitwer26 - Gaming Hardware & Streaming Gear | Migliori Offerte',
  description: 'Confronta prezzi e trova le migliori offerte su mouse gaming, monitor 144Hz, tastiere meccaniche, microfoni streaming e GPU. Aggiornato ogni giorno.',
  keywords: 'gaming hardware, streaming gear, mouse gaming, monitor 144hz, tastiera meccanica, offerte gaming',
  openGraph: {
    title: 'Kitwer26 - Gaming Hardware & Streaming Gear',
    description: 'Le migliori offerte su hardware gaming e streaming gear.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme — runs before React hydration */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`
        }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <ClientProviders>
            {children}
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
