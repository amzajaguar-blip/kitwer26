import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MARKETPLACE, buildAffiliateUrl, extractAsinFromUrl } from '@/lib/marketplace';
import type { AmazonLocale } from '@/lib/marketplace';
import { sendAdminEmail } from '@/lib/email';

const VALID_LOCALES = new Set<AmazonLocale>(['it', 'de', 'fr', 'es', 'uk', 'us']);

/**
 * POST /api/orders
 *
 * Crea un ordine su Supabase. Recupera i link Amazon (url) server-side
 * e li salva in order_items — mai esposti al client.
 * Invia email di notifica all'admin con dati cliente, prezzo pagato,
 * paese dell'utente e link Amazon locale con tag affiliazione.
 */
export async function POST(req: NextRequest) {
  // ── Leggi il body ──────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);

  if (!body?.customer || !body?.items?.length) {
    return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const { customer, items, total_amount, customer_country: rawCountry } = body as {
    customer: {
      name: string;
      surname: string;
      address: string;
      cap: string;
      city: string;
      phone: string;
      email?: string;
    };
    items: {
      product_id?: string | null;
      product_title: string;
      product_variant?: string | null;
      quantity: number;
      price_at_purchase: number;
    }[];
    total_amount: number;
    customer_country?: string;
  };

  const locale: AmazonLocale = VALID_LOCALES.has(rawCountry as AmazonLocale)
    ? (rawCountry as AmazonLocale)
    : 'it';

  // ── Client Supabase (service role per bypass RLS in scrittura) ─────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[orders] SUPABASE_URL o KEY mancante nelle env vars');
    return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Recupera gli URL Amazon lato server e costruisce link locale ───────────
  const titles = items.map((i) => i.product_title);
  const { data: productData, error: productErr } = await supabase
    .from('products')
    .select('title, url, product_url')
    .in('title', titles);

  if (productErr) {
    console.warn('[orders] Impossibile recuperare URL prodotti:', productErr.message);
  }

  const urlMap: Record<string, string> = {};
  (productData ?? []).forEach((p: { title: string; url?: string; product_url?: string }) => {
    const rawUrl = p.product_url || p.url;
    if (!rawUrl) return;
    const asin = extractAsinFromUrl(rawUrl);
    urlMap[p.title] = asin ? buildAffiliateUrl(asin, locale) : rawUrl;
  });

  // ── Crea l'ordine ──────────────────────────────────────────────────────────
  const orderPayload = {
    customer_name:    customer.name,
    customer_surname: customer.surname,
    customer_address: customer.address,
    customer_cap:     customer.cap,
    customer_city:    customer.city,
    customer_phone:   customer.phone,
    customer_email:   customer.email ?? null,
    customer_country: locale,
    total_amount,
    status: 'pending',
  };

  console.log('[orders] Inserimento ordine:', JSON.stringify(orderPayload));

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select()
    .single();

  if (orderErr) {
    console.error('[orders] Errore INSERT orders:', orderErr.code, orderErr.message, orderErr.details);
    const msg = orderErr.message.includes('column')
      ? `Colonna DB mancante: ${orderErr.message}. Esegui scripts/create-tables.sql su Supabase.`
      : orderErr.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── Crea gli articoli dell'ordine ──────────────────────────────────────────
  const orderItems = items.map((item) => ({
    order_id:          order.id,
    product_id:        item.product_id ?? null,
    product_title:     item.product_title,
    product_variant:   item.product_variant ?? null,
    quantity:          item.quantity,
    price_at_purchase: item.price_at_purchase,
    product_url:       urlMap[item.product_title] ?? null,
  }));

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsErr) {
    console.error('[order_items] Errore INSERT order_items:', itemsErr.code, itemsErr.message);
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  // ── Notifica email admin ────────────────────────────────────────────────────
  const market = MARKETPLACE[locale];

  try {
    const itemsHtml = orderItems
      .map((item) => {
        const linkHtml = item.product_url
          ? `<a href="${item.product_url}" style="color:#00D4FF;font-size:11px;word-break:break-all;">${item.product_url}</a>`
          : '<span style="color:#666;font-size:11px;">N/A</span>';
        return `<tr>
          <td style="padding:6px 0;color:#aaa;vertical-align:top;">${item.product_title}${item.product_variant ? ` — ${item.product_variant}` : ''}<br>${linkHtml}</td>
          <td style="padding:6px 0;text-align:right;vertical-align:top;">x${item.quantity}</td>
          <td style="padding:6px 0;text-align:right;font-weight:bold;vertical-align:top;">€${item.price_at_purchase.toFixed(2)}</td>
        </tr>`;
      })
      .join('');

    await sendAdminEmail({
      subject: `🛒 Nuovo Ordine — ${customer.name} ${customer.surname} — €${total_amount.toFixed(2)}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#111;color:#eee;padding:24px;border-radius:8px;">
          <h2 style="color:#00D4FF;margin-top:0;">🛒 Nuovo Ordine Ricevuto</h2>
          <p style="margin:0 0 4px;"><strong>Ordine:</strong> <span style="font-family:monospace;font-size:12px;">${order.id}</span></p>
          <p style="margin:0 0 4px;"><strong>Cliente:</strong> ${customer.name} ${customer.surname}</p>
          ${customer.email ? `<p style="margin:0 0 4px;"><strong>Email:</strong> ${customer.email}</p>` : ''}
          <p style="margin:0 0 4px;"><strong>Telefono:</strong> ${customer.phone}</p>
          <p style="margin:0 0 16px;"><strong>Indirizzo:</strong> ${customer.address}, ${customer.cap} ${customer.city}</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            ${itemsHtml}
            <tr style="border-top:1px solid #333;">
              <td colspan="2" style="padding:8px 0;font-weight:bold;text-align:right;">Totale pagato:</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold;color:#00D4FF;">€${total_amount.toFixed(2)}</td>
            </tr>
          </table>
          <div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:12px;margin-top:12px;">
            <p style="margin:0 0 4px;font-size:13px;font-weight:bold;">
              ${market.flag} Marketplace: ${market.label}
              <span style="font-weight:normal;color:#aaa;margin-left:8px;">Tag: ${market.tag}</span>
            </p>
          </div>
          <p style="margin-top:20px;font-size:12px;color:#666;">
            Accedi al pannello admin per visualizzare i dettagli completi e procedere con l'evasione.
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('[orders] Email send error:', emailErr);
    // Non blocca la risposta
  }

  console.log(`[orders] Ordine creato con successo: ${order.id}`);
  return NextResponse.json({ success: true, order_id: order.id });
}
