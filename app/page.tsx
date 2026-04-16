import { supabase } from '@/lib/supabase';
import HomepageClient from '@/components/HomepageClient';

// ISR: revalidate ogni 5 minuti — bilancia freshness e performance
export const revalidate = 300;

export default async function Page() {
  let productCount = 4000; // safe fallback
  try {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    if (count != null) productCount = count;
  } catch {
    // keep fallback
  }

  return <HomepageClient productCount={productCount} />;
}
