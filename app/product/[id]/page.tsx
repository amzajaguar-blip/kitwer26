import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import type { Product } from '@/types/product';
import ProductPageClient from '@/components/ProductPageClient';
import { fetchRelatedProducts } from '@/lib/products';

interface PageProps {
  params: Promise<{ id: string }>;
}

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = makeSupabase();
  if (!supabase) return {};

  const { data } = await supabase
    .from('products')
    .select('name, description, image_url, price')
    .eq('id', id)
    .single();

  if (!data) return {};

  const name = data.name ?? 'Prodotto';
  const desc = data.description
    ? String(data.description).slice(0, 155).replace(/<[^>]+>/g, '')
    : `${name} — selezionato da Kitwer26 per protezione professionale.`;
  const ogImage = data.image_url
    ? [{ url: data.image_url, alt: name }]
    : [{ url: '/icon.png', width: 512, height: 512, alt: 'KITWER26' }];
  const pageUrl = `https://kitwer26.com/product/${id}`;

  return {
    // absolute: bypassa il template '%s | KITWER26' del layout root
    // evita il titolo doppio: "... | KITWER26 | KITWER26"
    title: { absolute: `${name} — Protezione Professionale | KITWER26` },
    description: desc,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${name} | KITWER26`,
      description: desc,
      url: pageUrl,
      siteName: 'KITWER26',
      images: ogImage,
      type: 'website',
      locale: 'it_IT',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | KITWER26`,
      description: desc,
      images: data.image_url ? [data.image_url] : ['/icon.png'],
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    notFound();
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, description, image_url, image_urls, product_url, price, variants, sub_category')
    .eq('id', id)
    .single();

  if (error || !data) {
    notFound();
  }

  const product = data as Product;

  // Fetch prodotti correlati (categorie complementari, escluso il prodotto corrente)
  const relatedProducts = await fetchRelatedProducts(
    product.category ?? '',
    product.id ?? '',
    4,
  );

  const priceNum =
    typeof product.price === 'string'
      ? parseFloat(product.price)
      : typeof product.price === 'number'
        ? product.price
        : undefined;

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    ...(product.description && {
      description: String(product.description).replace(/<[^>]+>/g, '').slice(0, 500),
    }),
    image: product.image_url ?? product.image_urls?.[0],
    url: `https://kitwer26.com/product/${product.id}`,
    brand: { '@type': 'Brand', name: 'KITWER26' },
    ...(priceNum && !isNaN(priceNum) && !product.is_price_pending && {
      offers: {
        '@type': 'Offer',
        price: priceNum.toFixed(2),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
        url: product.product_url ?? `https://kitwer26.com/product/${product.id}`,
        seller: { '@type': 'Organization', name: 'KITWER26' },
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ProductPageClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}
