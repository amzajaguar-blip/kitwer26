import { NextResponse } from 'next/server';
import { getStrategicBundles } from '@/lib/bundles';

// Revalidate ogni 5 minuti (ISR-style caching)
export const revalidate = 300;

export async function GET() {
  try {
    const bundles = await getStrategicBundles();
    return NextResponse.json(
      { bundles },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (err) {
    console.error('[GET /api/bundles]', err);
    return NextResponse.json({ bundles: [], error: 'fetch_failed' }, { status: 500 });
  }
}
