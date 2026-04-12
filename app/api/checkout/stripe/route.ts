/**
 * POST /api/checkout/stripe
 *
 * Stripe Checkout Session con tax compliance internazionale automatica.
 * Checkout Stripe con tax compliance internazionale (EU IVA, UK VAT, US Sales Tax).
 *
 * Flusso:
 *   1. Valida body
 *   2. Salva ordine su Supabase (status: pending_stripe_payment)
 *   3. Crea Stripe Customer con indirizzo (per record fiscale)
 *   4. Crea Checkout Session con automatic_tax + invoice_creation
 *   5. Ritorna { success, checkoutUrl, orderId, stripeSessionId }
 *
 * Tax compliance (gestita da Stripe Tax — zero codice manuale):
 *   EU IVA:       automatica per paese (IT 22%, DE 19%, FR 20%…)
 *   UK VAT:       20% standard rate post-Brexit
 *   US Sales Tax: nexus-based (configurare in Stripe Dashboard)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import type Stripe                   from 'stripe';
import { sendAdminEmail }            from '@/lib/email';
import { audit, auditError }         from '@/lib/audit';
import {
  getStripe,
  detectTaxRegime,
  LOCALE_TO_COUNTRY,
  LOCALE_TO_STRIPE_LOCALE,
  KITWER26_TAX_CODE,
  ALLOWED_SHIPPING_COUNTRIES,
} from '@/lib/stripe';
import { MARKETPLACE }               from '@/lib/marketplace';
import type { AmazonLocale }         from '@/lib/marketplace';

const VALID_CURRENCIES = new Set(['EUR', 'GBP', 'USD']);
const VALID_LOCALES    = new Set<AmazonLocale>(['it','de','fr','es','uk','us']);

export async function POST(req: NextRequest) {
  // ── Parse body ───────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);

  if (!body?.productName || body?.finalPrice == null) {
    return NextResponse.json(
      { error: 'Dati mancanti (productName, finalPrice)' },
      { status: 400 },
    );
  }

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
      productId: string | null; productName: string;
      finalPrice: number; quantity: number;
    }> | null;
  };

  const locale: AmazonLocale = VALID_LOCALES.has(marketplace_locale as AmazonLocale)
    ? (marketplace_locale as AmazonLocale)
    : 'it';

  const stripeCurrency = (VALID_CURRENCIES.has(currency) ? currency : 'EUR').toLowerCase();
  const countryCode    = LOCALE_TO_COUNTRY[locale];
  const taxRegime      = detectTaxRegime(countryCode);
  const market         = MARKETPLACE[locale];

  // Stripe vuole i centesimi (integer) — round per sicurezza aritmetica float
  const unitAmountCents = Math.round(finalPrice * 100);
  const totalAmountEur  = (finalPrice * quantity);

  // ── Supabase ─────────────────────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
                   || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    auditError('auth.config.missing', { reason: 'SUPABASE_env_missing', source: 'stripe-checkout' });
    return NextResponse.json({ error: 'Configurazione server mancante' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Fetch product URLs per email admin ───────────────────────────────────────
  const productUrlMap = new Map<string, string>();
  const allIds = [
    ...(cartItems ?? []).map(i => i.productId).filter(Boolean) as string[],
    ...(productId ? [productId] : []),
  ];
  if (allIds.length > 0) {
    try {
      const { data: pds } = await supabase
        .from('products').select('id, product_url').in('id', allIds);
      for (const pd of pds ?? []) {
        if (pd.product_url) productUrlMap.set(String(pd.id), pd.product_url);
      }
    } catch { /* non bloccante */ }
  }
  const getProductUrl = (id: string | null | undefined) =>
    (id && productUrlMap.get(id)) ?? null;

  // ── 1. Salva ordine su Supabase ──────────────────────────────────────────────
  let orderId: string | null = null;

  try {
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        status:            'pending_stripe_payment',
        total_amount:      parseFloat(totalAmountEur.toFixed(2)),
        customer_name:     customer?.name     ?? '',
        customer_surname:  customer?.surname  ?? '',
        customer_address:  customer?.address  ?? '',
        customer_cap:      customer?.cap      ?? '',
        customer_city:     customer?.city     ?? '',
        customer_province: customer?.province ?? '',
        customer_phone:    customer?.phone    ?? '',
        customer_email:    customer?.email    ?? null,
        customer_country:  locale,
        payment_currency:  stripeCurrency.toUpperCase(),
      })
      .select().single();

    if (orderErr) {
      console.error('[stripe-checkout] DB insert order:', orderErr.message);
    } else if (orderData) {
      orderId = String(orderData.id);

      const itemsToInsert = cartItems?.length
        ? cartItems.map(item => ({
            order_id:          orderId!,
            product_id:        item.productId ?? null,
            product_title:     item.productName,
            product_variant:   null,
            quantity:          item.quantity,
            price_at_purchase: item.finalPrice * item.quantity,
            product_url:       getProductUrl(item.productId),
          }))
        : [{
            order_id:          orderId,
            product_id:        productId ?? null,
            product_title:     productName,
            product_variant:   null,
            quantity,
            price_at_purchase: parseFloat(totalAmountEur.toFixed(2)),
            product_url:       getProductUrl(productId),
          }];

      const { error: itemErr } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemErr) console.error('[stripe-checkout] DB insert items:', itemErr.message);
    }
  } catch (dbErr) {
    console.error('[stripe-checkout] DB error:', dbErr);
  }

  // ── 2. Notifica email admin — fire-and-forget (non blocca il checkout) ───────
  // NON usare await: aggiunge latenza prima di contattare Stripe e avvicina al timeout Vercel
  sendAdminEmail({
      subject: `⏳ Checkout Stripe avviato: ${productName} — ${stripeCurrency.toUpperCase()} ${totalAmountEur.toFixed(2)} [${taxRegime}]`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;background:#111;color:#eee;padding:24px;border-radius:8px;">
          <h2 style="color:#f97316;margin-top:0;">⏳ Pagamento Stripe in corso</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#aaa;padding:6px 0">Prodotto</td><td style="font-weight:bold">${productName}</td></tr>
            <tr><td style="color:#aaa;padding:6px 0">Importo</td><td style="font-weight:bold;color:#f97316">${stripeCurrency.toUpperCase()} ${totalAmountEur.toFixed(2)}</td></tr>
            <tr><td style="color:#aaa;padding:6px 0">Regime fiscale</td><td style="font-weight:bold;color:#22d3ee">${taxRegime}</td></tr>
            <tr><td style="color:#aaa;padding:6px 0">Paese</td><td>${market.flag} ${market.label} (${countryCode})</td></tr>
            ${customer ? `
            <tr style="border-top:1px solid #333"><td colspan="2" style="padding:10px 0 4px;font-weight:bold;color:#aaa">📦 Spedizione</td></tr>
            <tr><td style="color:#aaa;padding:4px 0">Cliente</td><td>${customer.name} ${customer.surname}</td></tr>
            <tr><td style="color:#aaa;padding:4px 0">Email</td><td>${customer.email}</td></tr>
            <tr><td style="color:#aaa;padding:4px 0">Telefono</td><td>${customer.phone}</td></tr>
            <tr><td style="color:#aaa;padding:4px 0">Indirizzo</td><td>${customer.address}, ${customer.cap} ${customer.city} (${customer.province})</td></tr>
            ` : ''}
            <tr><td style="color:#aaa;padding:4px 0">ID Ordine</td><td style="font-family:monospace;font-size:12px">${orderId ?? 'N/A'}</td></tr>
          </table>
          <p style="margin-top:16px;font-size:12px;color:#666">Riceverai conferma quando Stripe completerà il pagamento.</p>
        </div>
      `,
    }).catch(() => { /* fire-and-forget: errori email non bloccano il checkout */ });

  // ── 3. Stripe Checkout Session ───────────────────────────────────────────────

  // ── TASK 1: Fail-Fast — verifica chiave PRIMA di qualsiasi chiamata SDK ──────
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!stripeSecretKey) {
    console.error('[STRIPE CRITICAL] STRIPE_SECRET_KEY is missing or empty');
    auditError('auth.config.missing', { reason: 'STRIPE_SECRET_KEY_missing', source: 'stripe-checkout' });
    return NextResponse.json(
      { error: 'Stripe non configurato. Contatta il supporto.' },
      { status: 500 },
    );
  }

  try {
    // ── TASK 2: SDK inizializzato in lib/stripe.ts con version + timeout blindati
    const stripe = getStripe();

    const host      = req.headers.get('host') ?? 'kitwer26.com';
    const proto     = req.headers.get('x-forwarded-proto') ?? 'http';
    const base      = `${proto}://${host}`;
    const publicBase = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kitwer26.com';

    const successUrl = orderId
      ? `${base}/checkout/success?order=${orderId}`
      : `${base}/checkout/success`;
    const cancelUrl  = `${base}/checkout/error`;

    // ── 3a. Crea Stripe Customer (obbligatorio per record fiscale EU/UK) ────────
    // Il Customer con indirizzo è la fonte di verità per Stripe Tax:
    // senza indirizzo, Stripe Tax non può calcolare IVA/VAT correttamente.
    let stripeCustomerId: string | undefined;
    if (customer?.email) {
      try {
        const stripeCustomer = await stripe.customers.create({
          email: customer.email,
          name:  `${customer.name} ${customer.surname}`.trim(),
          phone: customer.phone || undefined,
          address: {
            line1:       customer.address,
            postal_code: customer.cap,
            city:        customer.city,
            country:     countryCode,
          },
          // shipping = stessa dell'indirizzo di fatturazione (B2C, comune per e-commerce)
          shipping: {
            name: `${customer.name} ${customer.surname}`.trim(),
            phone: customer.phone || undefined,
            address: {
              line1:       customer.address,
              postal_code: customer.cap,
              city:        customer.city,
              country:     countryCode,
            },
          },
          metadata: { order_id: orderId ?? '', kitwer26_locale: locale },
        });
        stripeCustomerId = stripeCustomer.id;

        // Salva stripe_customer_id sull'ordine per future referenze
        if (orderId) {
          await supabase.from('orders')
            .update({ stripe_customer_id: stripeCustomer.id })
            .eq('id', orderId);
        }
      } catch (custErr) {
        // Non fatale — procediamo senza customer pre-creato
        console.warn('[stripe-checkout] Customer creation failed:', custErr);
      }
    }

    // ── 3b. Costruisci line_items ────────────────────────────────────────────
    const lineItems = cartItems?.length
      ? cartItems.map(item => ({
          price_data: {
            currency:     stripeCurrency,
            product_data: {
              name:     item.productName,
              metadata: { product_id: item.productId ?? '' },
              tax_code: KITWER26_TAX_CODE,
            },
            unit_amount: Math.round(item.finalPrice * 100),
          },
          quantity: item.quantity,
        }))
      : [{
          price_data: {
            currency:     stripeCurrency,
            product_data: {
              name:     productName,
              metadata: { product_id: productId ?? '' },
              // txcd_34021000 = Electronics — garantisce tassazione corretta
              // per security hardware, hardware wallets, crypto devices
              tax_code: KITWER26_TAX_CODE,
            },
            unit_amount: unitAmountCents,
          },
          quantity,
        }];

    // ── 3c. Crea Checkout Session ─────────────────────────────────────────────
    // STRIPE_TAX_ENABLED=true richiede Stripe Tax attivato in Dashboard → Tax → Get started
    const stripeTaxEnabled = process.env.STRIPE_TAX_ENABLED === 'true';

    const session = await stripe.checkout.sessions.create({
      // Dati cliente pre-compilati (meno attrito, migliore UX)
      ...(stripeCustomerId
        ? { customer: stripeCustomerId }
        : { customer_email: customer?.email }),

      mode:       'payment',
      line_items: lineItems,

      // Metodi di pagamento compatibili con invoice_creation (payment mode).
      // sepa_debit/ideal/bancontact sono delayed-notification o redirect-based:
      // non compatibili con invoice_creation → StripeInvalidRequestError.
      // card è universale e sempre compatibile.
      payment_method_types: ['card'],

      // ── STRIPE TAX ──────────────────────────────────────────────────────
      // Abilitare solo se Stripe Tax è configurato nel Dashboard (Tax → Get started).
      // automatic_tax: { enabled: true } senza configurazione → StripeInvalidRequestError.
      // Impostare STRIPE_TAX_ENABLED=true su Vercel dopo aver attivato Stripe Tax.
      ...(stripeTaxEnabled && {
        automatic_tax: { enabled: true },
        tax_id_collection: { enabled: true },
      }),

      // ── COMPLIANCE DOCUMENT ─────────────────────────────────────────────
      // Genera un Invoice Stripe per ogni pagamento completato.
      // Compatibile con automatic_payment_methods ma NON con sepa_debit/ideal/bancontact
      // quando listati esplicitamente in payment_method_types.
      invoice_creation: {
        enabled: true,
        invoice_data: {
          description:  `KITWER26 — ${productName}`,
          custom_fields: [
            { name: 'Regime Fiscale', value: taxRegime },
            { name: 'Paese', value: `${market.label} (${countryCode})` },
            { name: 'Order ID', value: orderId ?? 'N/A' },
          ],
          // Mostra IVA inclusa nel totale (standard EU B2C)
          rendering_options: { amount_tax_display: 'include_inclusive_tax' },
          metadata: { order_id: orderId ?? '', tax_regime: taxRegime },
        },
      },

      // Raccolta indirizzo di spedizione se Customer non pre-creato
      ...(!stripeCustomerId && {
        shipping_address_collection: {
          allowed_countries: [...ALLOWED_SHIPPING_COUNTRIES] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
        },
      }),

      // UI locale matching del marketplace
      locale: LOCALE_TO_STRIPE_LOCALE[locale] as Stripe.Checkout.SessionCreateParams.Locale,

      success_url: successUrl,
      cancel_url:  cancelUrl,

      // Metadati per correlazione con il nostro ordine nel webhook
      metadata: {
        order_id:     orderId ?? '',
        product_id:   productId ?? '',
        product_name: productName,
        locale,
        tax_regime:   taxRegime,
      },

      // Collect phone if not pre-filled
      phone_number_collection: { enabled: !customer?.phone },
    });

    const checkoutUrl = session.url;
    if (!checkoutUrl) throw new Error('URL checkout non ricevuto da Stripe');

    // Salva stripe session ID sull'ordine
    if (orderId && session.id) {
      await supabase.from('orders')
        .update({ stripe_payment_id: session.id })
        .eq('id', orderId);
    }

    audit('payment.stripe.session.created', {
      orderId:    orderId ?? undefined,
      paymentId:  session.id,
      currency:   stripeCurrency.toUpperCase(),
      amount:     totalAmountEur,
      status:     'created',
      source:     taxRegime,
    });

    console.log(`[stripe-checkout] Session created — orderId=${orderId} sessionId=${session.id} currency=${stripeCurrency.toUpperCase()} taxRegime=${taxRegime}`);

    return NextResponse.json({
      success:         true,
      checkoutUrl,
      orderId,
      stripeSessionId: session.id,
    });

  } catch (stripeErr: unknown) {
    // ── TASK 3: Logging aggressivo per tipo di errore Stripe ─────────────────
    let userMessage = 'Impossibile contattare il server di pagamento. Riprova tra poco.';
    let httpStatus  = 502;

    if (stripeErr && typeof stripeErr === 'object' && 'type' in stripeErr) {
      const se = stripeErr as { type?: string; code?: string; message?: string; statusCode?: number; requestId?: string };

      // ── TASK 3: console.error con message + type + code ───────────────────
      console.error('[STRIPE CONNECTION ERROR]:', se.message, se.type, se.code, '| requestId:', se.requestId, '| orderId:', orderId);

      switch (se.type) {
        case 'StripeConnectionError':
          // Problema di rete SDK → Stripe API (timeout, DNS, TLS)
          // Causa più comune: API version incompatibile o Vercel timeout
          console.error('[STRIPE] StripeConnectionError — verifica API version in lib/stripe.ts e timeout Vercel');
          userMessage = 'Impossibile contattare il server di pagamento. Riprova tra poco.';
          httpStatus  = 502;
          break;

        case 'StripeAuthenticationError':
          // STRIPE_SECRET_KEY sbagliata o scaduta
          console.error('[STRIPE] StripeAuthenticationError — STRIPE_SECRET_KEY non valida. Controlla Vercel env vars.');
          userMessage = 'Errore di configurazione pagamento. Contatta il supporto.';
          httpStatus  = 500;
          break;

        case 'StripeInvalidRequestError':
          // Parametri non validi (es. payment_method_types non abilitati in dashboard)
          console.error('[STRIPE] StripeInvalidRequestError — parametri non validi:', se.message);
          userMessage = 'Errore nella richiesta di pagamento. Contatta il supporto.';
          httpStatus  = 400;
          break;

        case 'StripeRateLimitError':
          console.error('[STRIPE] StripeRateLimitError — troppe richieste');
          userMessage = 'Servizio di pagamento temporaneamente sovraccarico. Riprova tra 30 secondi.';
          httpStatus  = 429;
          break;

        default:
          console.error('[STRIPE] Errore generico tipo:', se.type, '| msg:', se.message);
      }
    } else {
      // Non è un errore Stripe nativo (es. throw manuale)
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      console.error('[STRIPE CONNECTION ERROR]:', msg, 'unknown', 'unknown');
    }

    auditError('payment.stripe.failed', {
      orderId: orderId ?? undefined,
      reason:  stripeErr instanceof Error ? stripeErr.message : 'Errore Stripe',
      source:  'stripe-checkout',
    });

    if (orderId) {
      await supabase.from('orders')
        .update({ status: 'stripe_error' })
        .eq('id', orderId);
    }

    return NextResponse.json({ error: userMessage }, { status: httpStatus });
  }
}
