import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BUNDLE_META, resolveBundleById } from '@/lib/bundles';
import BundlePageClient from './BundlePageClient';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

// ISR: rigenerazione automatica ogni ora — i prodotti Supabase cambiano nel tempo
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ id: string }>;
}

// Pre-rendering statico dei 5 bundle a build time (SSG + ISR)
export function generateStaticParams() {
  return BUNDLE_META.map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const meta = BUNDLE_META.find((b) => b.id === id);
  if (!meta) return {};

  const title       = `${meta.title} — Bundle Tattico d'Élite | KITWER26`;
  const description = `${meta.description} ${meta.highlight}`;
  const pageUrl     = `https://kitwer26.com/bundle/${id}`;

  return {
    // absolute: bypassa il template '%s | KITWER26' del layout root
    title: { absolute: title },
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'KITWER26',
      images: [{ url: '/icon.png', width: 512, height: 512, alt: `KITWER26 — ${meta.title}` }],
      type: 'website',
      locale: 'it_IT',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/icon.png'],
    },
  };
}

export default async function BundlePage({ params }: PageProps) {
  const { id } = await params;
  const bundle = await resolveBundleById(id);
  if (!bundle) notFound();

  // ── JSON-LD: ItemList (prodotti) + BreadcrumbList (navigazione) ──────────
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ItemList',
        '@id': `https://kitwer26.com/bundle/${id}#itemlist`,
        name: bundle.title,
        description: bundle.description,
        url: `https://kitwer26.com/bundle/${id}`,
        numberOfItems: bundle.products.length,
        itemListElement: bundle.products.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Product',
            name: p.name,
            ...(p.image_url && { image: p.image_url }),
            url: p.product_url ?? `https://kitwer26.com/product/${p.id}`,
            brand: { '@type': 'Brand', name: 'KITWER26' },
            offers: {
              '@type': 'Offer',
              price: p.price.toFixed(2),
              priceCurrency: 'EUR',
              availability: 'https://schema.org/InStock',
              url: p.product_url ?? `https://kitwer26.com/product/${p.id}`,
              seller: { '@type': 'Organization', name: 'KITWER26' },
            },
          },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'KITWER26', item: 'https://kitwer26.com' },
          { '@type': 'ListItem', position: 2, name: 'Bundle', item: 'https://kitwer26.com/#bundles' },
          { '@type': 'ListItem', position: 3, name: bundle.title, item: `https://kitwer26.com/bundle/${id}` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen pt-[88px] bg-zinc-950 overflow-x-hidden">
        <Header />
        <BundlePageClient bundle={bundle} />
        <Footer />
        <CartDrawer />
      </div>
    </>
  );
}
