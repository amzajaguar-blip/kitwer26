import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  }

  const headers: HeadersInit = {
    apikey:          serviceKey,
    Authorization:   `Bearer ${serviceKey}`,
    'Content-Type':  'application/json',
  };

  const since       = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const since24h    = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oneHourAgo  = new Date(Date.now() -      60 * 60 * 1000).toISOString();

  const [telRes, ordRes, abandRes] = await Promise.all([
    // Visite ultimi 7 giorni
    fetch(
      `${supabaseUrl}/rest/v1/telemetry?created_at=gte.${since}&select=page_path,created_at`,
      { headers },
    ),
    // Ordini confermati/spediti/consegnati ultimi 7 giorni (revenue reale)
    fetch(
      `${supabaseUrl}/rest/v1/orders?created_at=gte.${since}&status=in.(confirmed,shipped,delivered)&select=total_amount,created_at,status`,
      { headers },
    ),
    // Sessioni pending più vecchie di 1 ora nelle ultime 24 ore
    fetch(
      `${supabaseUrl}/rest/v1/orders?status=in.(pending,pending_payment)&created_at=gte.${since24h}&created_at=lt.${oneHourAgo}&select=id`,
      { headers },
    ),
  ]);

  const telemetry: { page_path: string; created_at: string }[]                  = telRes.ok  ? await telRes.json()  : [];
  const orders:    { total_amount: number; created_at: string; status: string }[] = ordRes.ok  ? await ordRes.json()  : [];
  const abandoned: { id: string }[]                                               = abandRes.ok ? await abandRes.json() : [];

  // Costruisce chart per ultimi 7 giorni
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    days.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  }

  const visitsByDay:  Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
  const revenueByDay: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
  const ordersByDay:  Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));

  for (const t of telemetry) {
    const d = t.created_at?.slice(0, 10);
    if (d && d in visitsByDay) visitsByDay[d]++;
  }
  for (const o of orders) {
    const d = o.created_at?.slice(0, 10);
    if (d && d in revenueByDay) {
      revenueByDay[d] += o.total_amount ?? 0;
      ordersByDay[d]++;
    }
  }

  const chartData = days.map(d => ({
    date:    d.slice(5),
    visits:  visitsByDay[d],
    revenue: Math.round(revenueByDay[d] * 100) / 100,
    orders:  ordersByDay[d],
  }));

  const totalVisits  = telemetry.length;
  const totalOrders  = orders.length;                                               // solo ordini confermati
  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount ?? 0), 0);

  return NextResponse.json({
    chartData,
    totalVisits,
    totalOrders,
    totalRevenue:   Math.round(totalRevenue * 100) / 100,
    convRate:       totalVisits > 0 ? +((totalOrders / totalVisits) * 100).toFixed(2) : 0,
    netProfit:      Math.round(totalRevenue * 0.20 * 100) / 100,
    abandonedCarts: Array.isArray(abandoned) ? abandoned.length : 0,
  });
}
