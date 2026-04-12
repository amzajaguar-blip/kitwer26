import { supabase } from '@/lib/supabase';
import HomepageClient from '@/components/HomepageClient';

export default async function Page() {
  let productCount = 4000; // safe fallback
  try {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .gt('price', 0);
    if (count != null) productCount = count;
  } catch {
    // keep fallback
  }

  return <HomepageClient productCount={productCount} />;
}
