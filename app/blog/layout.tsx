import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:       'Guide & Confronti Hardware 2026 | Kitwer26',
  description: 'Confronti hardware, guide crypto security, FPV drones e sim racing. Analisi tecniche e tabelle comparative. Dati reali, nessuna opinione.',
  alternates:  { canonical: 'https://kitwer26.com/blog' },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
