import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  const db = getServiceClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data, error } = await db
    .from('analytics')
    .select('product_slug, product_title')
    .eq('event_type', 'page_view')
    .gte('created_at', today.toISOString())

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, { title: string; count: number }> = {}
  for (const row of data ?? []) {
    if (!counts[row.product_slug]) {
      counts[row.product_slug] = { title: row.product_title, count: 0 }
    }
    counts[row.product_slug].count++
  }

  const top3 = Object.entries(counts)
    .map(([slug, { title, count }]) => ({ slug, title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return NextResponse.json({ top3 })
}
