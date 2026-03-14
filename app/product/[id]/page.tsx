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
    .select('name, description')
    .eq('id', id)
    .single();

  if (!data) return {};

  const name = data.name ?? 'Prodotto';
  const desc = data.description
    ? String(data.description).slice(0, 155).replace(/<[^>]+>/g, '')
    : `${name} — selezionato da Kitwer26 per protezione professionale.`;

  return {
    title: `${name} - Protezione Professionale | Kitwer26`,
    description: desc,
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
    .select('id, name, category, description, image_url, image_urls, affiliate_url, price')
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

  return <ProductPageClient product={product} relatedProducts={relatedProducts} />;
}
