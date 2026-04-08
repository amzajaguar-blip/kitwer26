import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:       'Guide & Confronti Hardware 2026 | Kitwer26',
  description: 'Confronti hardware, guide crypto security, FPV e sim racing. Analisi tecniche, tabelle comparative e bundle curati a €299. Dati reali, nessuna opinione.',
  alternates:  { canonical: 'https://kitwer26.com/blog' },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
