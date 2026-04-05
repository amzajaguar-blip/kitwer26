import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.productId !== 'string') {
    return NextResponse.json(
      { error: 'productId mancante o non valido' },
      { status: 400 }
    );
  }

  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const newUrl = rawUrl.length > 0 ? rawUrl : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[manage-links] SUPABASE_URL o KEY mancante nelle env vars');
    return NextResponse.json(
      { error: 'Configurazione server mancante' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('products')
    .update({ product_url: newUrl })
    .eq('id', body.productId);

  if (error) {
    console.error(
      '[manage-links] Errore UPDATE products.url:',
      error.code,
      error.message,
      error.details
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

