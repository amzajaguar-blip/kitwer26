import { createClient } from '@supabase/supabase-js';

// Server-only: uses service role for fetching blog product data
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export interface BlogProductData {
  id:            string;
  name:          string;
  price:         number;
  image_url:     string | null;
  image_urls:    string[] | null;
  affiliate_url: string | null;
  category:      string | null;
}

/**
 * Fetch a product from DB by case-insensitive name pattern.
 * Returns null if not found or is_active=false (hidden).
 */
export async function fetchBlogProduct(
  namePattern: string,
  affiliateUrlFallback?: string,
): Promise<BlogProductData | null> {
  const sb = getSupabase();

  const { data } = await sb
    .from('products')
    .select('id, name, price, image_url, image_urls, affiliate_url, category')
    .ilike('name', `%${namePattern}%`)
    .eq('is_active', true)
    .order('price', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    ...data,
    affiliate_url: data.affiliate_url ?? affiliateUrlFallback ?? null,
  };
}
