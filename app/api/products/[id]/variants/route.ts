import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/products/[id]/variants — lettura pubblica varianti
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, variant_type, name, color_hex, price_override, stock_quantity, image_url, sort_order')
    .eq('product_id', id)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variants: data ?? [] })
}
