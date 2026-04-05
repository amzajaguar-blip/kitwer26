import { NextResponse } from 'next/server';
import { getTacticalDeals } from '@/lib/products';

// Cache 1h — i deals non cambiano ogni secondo
export const revalidate = 3600;

export async function GET() {
  try {
    const deals = await getTacticalDeals(8);
    return NextResponse.json({ deals }, { status: 200 });
  } catch (err) {
    console.error('[/api/deals]', err);
    return NextResponse.json({ deals: [] }, { status: 500 });
  }
}
