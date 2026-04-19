import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title:       'Guide & Confronti Hardware 2026 | Kitwer26',
  description: 'Confronti hardware, guide crypto security, FPV drones e sim racing. Analisi tecniche e tabelle comparative. Dati reali, nessuna opinione.',
  alternates:  { canonical: 'https://kitwer26.com/blog' },
  openGraph: {
    title:       'Guide & Confronti Hardware 2026 | Kitwer26',
    description: 'Confronti hardware, guide crypto security, FPV drones e sim racing. Analisi tecniche e tabelle comparative. Dati reali, nessuna opinione.',
    url:         'https://kitwer26.com/blog',
    siteName:    'Kitwer26',
    locale:      'it_IT',
    type:        'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kitwer26 Blog — Guide & Confronti Hardware 2026' }],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <div className="pt-[88px]">
        {children}
      </div>
      <Footer />
    </>
  );
}
