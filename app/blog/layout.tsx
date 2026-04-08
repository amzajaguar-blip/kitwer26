import type { Metadata } from 'next';

export const metadata: Metadata = {
  title:       'Blog & Confronti | Kitwer26',
  description: 'Guide tattiche, confronti hardware e analisi di sicurezza digitale. Tutto quello che devi sapere prima di acquistare.',
  alternates:  { canonical: 'https://kitwer26.com/blog' },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
