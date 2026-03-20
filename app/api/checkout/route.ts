import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MARKETPLACE, buildAffiliateUrl, extractAsinFromUrl } from '@/lib/marketplace';
import type { AmazonLocale } from '@/lib/marketplace';
import { sendAdminEmail } from '@/lib/email';

const MOLLIE_API = 'https://api.mollie.com/v2';
const VALID_LOCALES = new Set<AmazonLocale>(['it', 'de', 'fr', 'es', 'uk', 'us']);

/**
 * POST /api/checkout
 *
 * Smart Checkout Mollie — flusso:
 * 1. Valida il body
 * 2. Registra l'ordine su Supabase con status "pending_mollie_payment"
 * 3. Invia notifica email admin via Resend
 * 4. Crea pagamento su Mollie e restituisce il checkoutUrl
 */
export async function POST(req: NextRequest) {
  // ── Leggi body ──────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);

  if (!body?.productName || body?.finalPrice == null) {
    return NextResponse.json({ error: 'Dati mancanti (productName, finalPrice)' }, { status: 400 });
  }

  const VALID_CURRENCIES = new Set(['EUR', 'GBP', 'USD']);

  const {
    productId          = null,
    productName,
    finalPrice,
    quantity           = 1,
    currency           = 'EUR',
    marketplace_locale = 'it',
    customer           = null,
    cartItems          = null,
  } = body as {
    productId?:          string | null;
    productName:         string;
    finalPrice:          number;
    quantity?:           number;
    currency?:           string;
    marketplace_locale?: string;
    customer?: {
      name: string; surname: string; email: string; phone: string;
      address: string; cap: string; city: string; province: string;
    } | null;
    cartItems?: Array<{
      productId: string | null; productName: string; finalPrice: number; quantity: number;
    }> | null;
  };

  const locale: AmazonLocale = VALID_LOCALES.has(marketplace_locale as AmazonLocale)
    ? (marketplace_locale as AmazonLocale)
    : 'it';

  const mollieCurrency: 'EUR' | 'GBP' | 'USD' =
    VALID_CURRENCIES.has(currency) ? (currency as 'EUR' | 'GBP' | 'USD') : 'EUR';

  const totalAmount = (finalPrice * quantity).toFixed(2);

  // ── Supabase client ─────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
                   || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[checkout] SUPABASE env mancanti');
    return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Recupero product_url diretto per ogni item (batch) ──────────────────────
  // Mappa productId → product_url Amazon diretto (NO tag affiliato).
  // L'admin riceve il link esatto per acquistare il prodotto su Amazon.
  const productUrlMap = new Map<string, string>();

  const allIds = [
    ...(cartItems ?? []).map(i => i.productId).filter(Boolean) as string[],
    ...(productId ? [productId] : []),
  ];

  if (allIds.length > 0) {
    try {
      const { data: pds } = await supabase
        .from('products')
        .select('id, product_url')
        .in('id', allIds);

      for (const pd of pds ?? []) {
        if (pd.product_url) productUrlMap.set(String(pd.id), pd.product_url);
      }
    } catch { /* non bloccante */ }
  }

  // Helper: restituisce il product_url diretto (o null se non trovato)
  function getAffiliateUrl(id: string | null | undefined): string | null {
    return (id && productUrlMap.get(id)) ?? null;
  }

  // ── 1. Salva ordine su Supabase con dati cliente completi ───────────────────
  let orderId: string | null = null;

  try {
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        status:            'pending_mollie_payment',
        total_amount:      parseFloat(totalAmount),
        customer_name:     customer?.name     ?? '',
        customer_surname:  customer?.surname  ?? '',
        customer_address:  customer?.address  ?? '',
        customer_cap:      customer?.cap      ?? '',
        customer_city:     customer?.city     ?? '',
        customer_province: customer?.province ?? '',
        customer_phone:    customer?.phone    ?? '',
        customer_email:    customer?.email    ?? null,
        customer_country:  locale,
      })
      .select()
      .single();

    if (orderErr) {
      console.error('[checkout] DB insert order:', orderErr.message);
    } else if (orderData) {
      orderId = String(orderData.id);

      // Inserisci tutti gli item (carrello multi-prodotto o singolo)
      const itemsToInsert = cartItems && cartItems.length > 0
        ? cartItems.map((item) => ({
            order_id:          orderId!,
            product_id:        item.productId ?? null,
            product_title:     item.productName,
            product_variant:   null,
            quantity:          item.quantity,
            price_at_purchase: item.finalPrice * item.quantity,
            product_url:       getAffiliateUrl(item.productId),   // ← link specifico per ogni prodotto
          }))
        : [{
            order_id:          orderId,
            product_id:        productId ?? null,
            product_title:     productName,
            product_variant:   null,
            quantity,
            price_at_purchase: parseFloat(totalAmount),
            product_url:       getAffiliateUrl(productId),         // ← link del singolo prodotto
          }];

      const { error: itemErr } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemErr) console.error('[checkout] DB insert order_items:', itemErr.message);
    }
  } catch (dbErr) {
    console.error('[checkout] DB error:', dbErr);
    // Non blocca il flusso — continuiamo con Mollie
  }

  // ── 2. Notifica email admin ─────────────────────────────────────────────────
  const market = MARKETPLACE[locale];

  try {
    await sendAdminEmail({
      subject: `⚠️ Nuovo pagamento Mollie: ${productName} — ${mollieCurrency} ${totalAmount}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#111;color:#eee;padding:24px;border-radius:8px;">
          <h2 style="color:#f97316;margin-top:0;">⚠️ Pagamento avviato — in attesa conferma Mollie</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#aaa;">Prodotto</td><td style="padding:6px 0;font-weight:bold;">${productName}</td></tr>
            <tr><td style="padding:6px 0;color:#aaa;">Importo</td><td style="padding:6px 0;font-weight:bold;color:#f97316;">${mollieCurrency} ${totalAmount}</td></tr>
            <tr><td style="padding:6px 0;color:#aaa;">Paese</td><td style="padding:6px 0;">${market.flag} ${market.label}</td></tr>
            ${customer ? `
            <tr style="border-top:1px solid #333;"><td colspan="2" style="padding:10px 0 4px;font-weight:bold;color:#aaa;">📦 Dati Spedizione</td></tr>
            <tr><td style="padding:4px 0;color:#aaa;">Cliente</td><td style="padding:4px 0;">${customer.name} ${customer.surname}</td></tr>
            <tr><td style="padding:4px 0;color:#aaa;">Email</td><td style="padding:4px 0;">${customer.email}</td></tr>
            <tr><td style="padding:4px 0;color:#aaa;">Telefono</td><td style="padding:4px 0;">${customer.phone}</td></tr>
            <tr><td style="padding:4px 0;color:#aaa;">Indirizzo</td><td style="padding:4px 0;">${customer.address}, ${customer.cap} ${customer.city} (${customer.province})</td></tr>
            ` : ''}
            <tr style="border-top:1px solid #333;"><td style="padding:10px 0 4px;color:#aaa;">Link Amazon</td>
              <td style="padding:10px 0 4px;"><a href="${getAffiliateUrl(productId)}" style="color:#00D4FF;word-break:break-all;">${getAffiliateUrl(productId)}</a><span style="display:block;font-size:11px;color:#666;">Tag: ${market.tag}</span></td>
            </tr>
            <tr><td style="padding:4px 0;color:#aaa;">ID Ordine</td><td style="padding:4px 0;font-family:monospace;font-size:12px;">${orderId ?? 'N/A'}</td></tr>
            <tr><td style="padding:4px 0;color:#aaa;">Timestamp</td><td style="padding:4px 0;">${new Date().toLocaleString('it-IT')}</td></tr>
          </table>
          <p style="margin-top:20px;font-size:12px;color:#666;">
            Riceverai una seconda notifica quando Mollie confermerà il pagamento.
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('[checkout] Email send error:', emailErr);
    // Non blocca il flusso
  }

  // ── 3. Crea pagamento Mollie ────────────────────────────────────────────────
  const mollieKey = process.env.MOLLIE_API_KEY;

  if (!mollieKey) {
    console.error('[checkout] MOLLIE_API_KEY non configurato');
    return NextResponse.json(
      { error: 'Pagamento Mollie non configurato. Contatta il supporto.' },
      { status: 500 }
    );
  }

  try {
    // redirectUrl: derivato dall'host della richiesta (funziona sia in locale che in prod)
    // NOTA: x-forwarded-proto NON esiste in Next.js dev locale (nessun proxy) →
    //       default 'http' per evitare https://localhost che causa SSL error nel browser.
    //       In produzione/Vercel, x-forwarded-proto è sempre 'https'.
    const host        = req.headers.get('host') ?? 'kitwer26.com';
    const proto       = req.headers.get('x-forwarded-proto') ?? 'http';
    const requestBase = `${proto}://${host}`;

    // Mollie reindirizza sempre al success — la success page legge lo stato
    // e ri-dirige a /checkout/error se il pagamento risulta fallito/annullato.
    const redirectUrl = orderId
      ? `${requestBase}/checkout/success?order=${orderId}`
      : `${requestBase}/checkout/success`;

    // webhookUrl: deve essere un URL pubblico HTTPS raggiungibile da Mollie
    const publicBase  = process.env.NEXT_PUBLIC_SITE_URL || 'https://kitwer26.com';
    const webhookUrl  = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/webhook/mollie`
      : (process.env.MOLLIE_WEBHOOK_URL ?? `${publicBase}/api/webhook/mollie`);

    // Mappa locale → Mollie locale (BCP 47)
    const mollieLocaleMap: Record<string, string> = {
      it: 'it_IT', de: 'de_DE', fr: 'fr_FR',
      es: 'es_ES', uk: 'en_GB', us: 'en_US',
    };
    const mollieLocale = mollieLocaleMap[locale] ?? 'it_IT';

    // Metodi abilitati: escluso paypal perché in test-mode Mollie/PayPal
    // causa errori di protocollo in Firefox/Chrome (bug noto Mollie sandbox).
    // In produzione rimuovere il filtro o aggiungere 'paypal' all'array.
    const isTestMode = mollieKey.startsWith('test_');
    const allowedMethods = isTestMode
      ? ['creditcard', 'ideal', 'bancontact', 'eps', 'giropay', 'sofort']
      : undefined; // in prod offriamo tutti i metodi disponibili

    const mollieRes = await fetch(`${MOLLIE_API}/payments`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${mollieKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: mollieCurrency,
          value:    totalAmount,
        },
        description:  `Kitwer26 — ${productName}`,
        redirectUrl,
        webhookUrl,
        locale:       mollieLocale,
        ...(allowedMethods ? { method: allowedMethods } : {}),
        metadata: {
          order_id:     orderId,
          product_id:   productId,
          product_name: productName,
        },
      }),
    });

    const mollieData = await mollieRes.json();

    if (!mollieRes.ok) {
      throw new Error(
        mollieData?.detail || mollieData?.title || 'Errore risposta Mollie'
      );
    }

    const checkoutUrl: string | undefined = mollieData._links?.checkout?.href;

    if (!checkoutUrl) {
      throw new Error('URL checkout non ricevuto da Mollie');
    }

    // Salva mollieId nell'ordine per poter verificare il pagamento lato success page
    if (orderId && mollieData.id) {
      await supabase
        .from('orders')
        .update({ mollie_payment_id: mollieData.id })
        .eq('id', orderId);
    }

    console.log(`[checkout] Pagamento Mollie creato — orderId=${orderId} mollieId=${mollieData.id} amount=${mollieCurrency} ${totalAmount} locale=${locale}`);

    return NextResponse.json({
      success:     true,
      checkoutUrl,
      orderId,
      mollieId:    mollieData.id,
    });

  } catch (mollieErr) {
    console.error('[checkout] Mollie error:', mollieErr);

    // Aggiorna lo stato ordine a failed se era stato creato
    if (orderId) {
      await supabase
        .from('orders')
        .update({ status: 'mollie_error' })
        .eq('id', orderId);
    }

    return NextResponse.json(
      { error: mollieErr instanceof Error ? mollieErr.message : 'Errore pagamento' },
      { status: 502 }
    );
  }
}
