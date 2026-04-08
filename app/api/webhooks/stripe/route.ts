/**
 * POST /api/webhooks/stripe
 *
 * Webhook Stripe — Node.js Runtime.
 * API Version: 2026-01-28.clover (pinned — deve corrispondere alla versione configurata nel Dashboard).
 *
 * URL: https://www.kitwer26.com/api/webhooks/stripe
 *
 * ── Security model (livello bancario) ──────────────────────────────────────────
 *   Task 2: req.text()  → raw body grezzo, non alterato da alcun middleware
 *   Task 3: constructEvent() → verifica HMAC-SHA256 prima di qualsiasi logica
 *   Task 4: switch su esattamente 2 eventi di pagamento confermato
 *   Task 5: update ordine Supabase (Service Role) + insert audit_logs PAYMENT_RECEIVED
 *
 * ── Idempotenza ────────────────────────────────────────────────────────────────
 *   confirmation_email_sent previene double-processing su retry Stripe (ogni evento
 *   può arrivare più volte — Stripe garantisce at-least-once delivery).
 *
 * ── Timeout Stripe ─────────────────────────────────────────────────────────────
 *   Il webhook deve rispondere entro 30s. Tutta la logica è asincrona e non blocca
 *   la risposta 200 finale — Stripe non reinvierà se riceve 200.
 *
 * ── Setup Stripe Dashboard ─────────────────────────────────────────────────────
 *   1. Developers → Webhooks → Add endpoint
 *   2. URL: https://www.kitwer26.com/api/webhooks/stripe
 *   3. API Version: 2026-01-28.clover
 *   4. Events:
 *        checkout.session.completed              (carta, pagamento sincrono)
 *        checkout.session.async_payment_succeeded (SEPA/iDEAL, pagamento asincrono)
 *        checkout.session.async_payment_failed   (fallimento asincrono)
 *   5. Signing secret → STRIPE_WEBHOOK_SECRET env var su Vercel
 */

// Node.js Runtime — lib/email usa pdf-lib + qrcode che richiedono Node.js Buffer API.
// constructEvent() è sincrono e nativo Node.js (usa node:crypto internamente).

import { NextRequest, NextResponse }                          from 'next/server';
import { createClient }                                        from '@supabase/supabase-js';
import { getStripe }                                           from '@/lib/stripe';
import { MARKETPLACE, buildAffiliateUrl, extractAsinFromUrl, buildSearchUrl, isAsinReachable } from '@/lib/marketplace';
import type { AmazonLocale }                                    from '@/lib/marketplace';
import { sendOrderConfirmationEmail, sendAdminEmail, sendPaymentFailedEmail } from '@/lib/email';
import { audit, auditWarn, auditError }                        from '@/lib/audit';
import type { OrderItemRow, DealRow }                           from '@/lib/schemas';
import type { TacticalDealItem }                                from '@/lib/pdf';
import type Stripe                                              from 'stripe';

// ── Costanti ──────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };

// ── Tipi locali per i risultati Supabase ──────────────────────────────────────

interface OrderQueryRow {
  id:                      string;
  created_at:              string;
  customer_name:           string | null;
  customer_surname:        string | null;
  customer_email:          string | null;
  customer_phone:          string | null;
  customer_address:        string | null;
  customer_city:           string | null;
  customer_cap:            string | null;
  customer_country:        string | null;
  total_amount:            number;
  confirmation_email_sent: boolean | null;
  order_items:             OrderItemRow[];
}

interface FailedOrderQueryRow {
  customer_name:  string | null;
  customer_email: string | null;
}

// ── Supabase (Task 5 — obbligatorio Service Role per scrivere su audit_logs) ──

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service Role obbligatorio — mai ANON
  if (!url || !key) {
    throw new Error('[stripe-webhook] NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti');
  }
  return createClient(url, key, {
    auth: { persistSession: false }, // server-side: nessuna sessione client
  });
}

// ── Task 5: Insert diretto su audit_logs con event_type PAYMENT_RECEIVED ───────
//
// Separato da lib/audit.ts (che usa event category generiche).
// Questo record è il "libro mastro" finanziario: importo, valuta, sessione Stripe.

async function writePaymentReceivedAudit(
  supabase:    ReturnType<typeof getSupabase>,
  orderId:     string,
  sessionId:   string,
  amount:      number,
  currency:    string,
  trigger:     'sync' | 'async',
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    event_type: 'PAYMENT_RECEIVED',
    severity:   'INFO',
    actor_id:   'STRIPE_WEBHOOK',
    metadata: {
      order_id:         orderId,
      stripe_session_id: sessionId,
      amount,
      currency,
      payment_trigger:  trigger,           // 'sync' = carta | 'async' = SEPA/iDEAL
      recorded_at:      new Date().toISOString(),
    },
  });
  if (error) {
    // Non bloccante — il pagamento è già confermato, il log non deve interrompere il flusso
    console.error('[stripe-webhook] audit_logs insert fallito:', error.message);
  }
}

// ── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // ── Task 2: Raw Body + stripe-signature ───────────────────────────────────────
  // req.text() restituisce il payload byte-per-byte senza alcuna trasformazione.
  // CRITICO: req.json() o body-parser altererebbero la stringa e invaliderebbero il MAC.
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  // ── Task 3: Validazione Crittografica ─────────────────────────────────────────
  // constructEvent() verifica HMAC-SHA256(body, secret) === stripe-signature header.
  // Qualsiasi richiesta non firmata da Stripe viene rifiutata qui — nessun codice
  // successivo viene eseguito.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    auditError('auth.config.missing', { reason: 'STRIPE_WEBHOOK_SECRET_missing', source: 'stripe-webhook' });
    return NextResponse.json({ error: 'Webhook non configurato' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[SECURITY ALERT] Invalid Stripe Signature — ${msg}`);
    auditError('payment.stripe.webhook.sig_failed', { reason: msg, source: 'stripe-webhook' });
    // Risposta volutamente vaga: non esporre il dettaglio dell'errore crittografico
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  audit('payment.stripe.webhook.received', { status: event.type, paymentId: event.id });

  // ── Task 4: Switch esattamente sui 2 eventi di pagamento confermato ───────────
  // REGOLA: non restituire mai 4xx/5xx dopo questo punto — Stripe reinvierebbe
  // l'evento indefinitamente. Logga l'errore e rispondi 200.
  try {
    switch (event.type) {

      // Carta di credito/debito, Apple Pay, Google Pay — fondi garantiti immediatamente
      case 'checkout.session.completed':
        await handlePaymentConfirmed(event.data.object as Stripe.Checkout.Session, 'sync');
        break;

      // SEPA Direct Debit, iDEAL, Bancontact — arriva DOPO completed, fondi ora incassati
      case 'checkout.session.async_payment_succeeded':
        await handlePaymentConfirmed(event.data.object as Stripe.Checkout.Session, 'async');
        break;

      // Pagamento asincrono fallito (es. addebito SEPA rifiutato dalla banca)
      case 'checkout.session.async_payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        // Evento non in scope — 200 senza elaborazione
        console.log(`[stripe-webhook] Evento ricevuto ma non gestito: ${event.type}`);
    }
  } catch (err) {
    // Errore interno inatteso — logga ma non bloccare Stripe con un 5xx
    console.error('[stripe-webhook] Errore non gestito durante elaborazione evento:', err);
  }

  // Stripe richiede 200 per confermare la ricezione dell'evento
  return NextResponse.json({ received: true }, { status: 200 });
}

// ── Task 4+5: handlePaymentConfirmed ─────────────────────────────────────────
//
// Gestisce checkout.session.completed (sync) e async_payment_succeeded (async).
// In entrambi i casi il denaro è nelle mani di Kitwer26 — si procede con:
//   1. Estrazione orderId dal metadata (con doppio fallback order_id / orderId)
//   2. Update ordine Supabase → status 'confirmed', dati fiscali completi
//   3. Insert audit_logs: event_type PAYMENT_RECEIVED con importo e valuta
//   4. Email conferma cliente + PDF operativo
//   5. Email admin con riepilogo fiscale

async function handlePaymentConfirmed(
  session: Stripe.Checkout.Session,
  trigger: 'sync' | 'async',
) {
  // ── Task 4: Identificazione acquisto dal metadata ─────────────────────────────
  // Supporto doppio formato: snake_case (standard kitwer26) con fallback camelCase
  const orderId      = session.metadata?.order_id ?? session.metadata?.orderId ?? null;
  const customerId   = typeof session.customer === 'string' ? session.customer : null;

  // Dati finanziari — amount_total è in centesimi, garantito da Stripe post-tax
  const taxRegime    = session.metadata?.tax_regime ?? 'UNKNOWN';
  const paidAmount   = (session.amount_total ?? 0) / 100;
  const paidCurrency = (session.currency ?? 'eur').toUpperCase();
  const taxAmount    = (session.total_details?.amount_tax ?? 0) / 100;
  const txSymbol     = CURRENCY_SYMBOLS[paidCurrency] ?? paidCurrency;

  audit('payment.stripe.completed', {
    orderId:  orderId ?? undefined,
    paymentId: session.id,
    amount:   paidAmount,
    currency: paidCurrency,
    status:   session.payment_status,
    source:   trigger,
  });

  if (!orderId) {
    // Metadata mancante — log e uscita (non possiamo linkare la sessione a un ordine)
    console.error(`[stripe-webhook] order_id assente nel metadata — sessionId: ${session.id} customerId: ${customerId}`);
    return;
  }

  // ── Task 5a: Update Supabase ordine → status 'confirmed' ─────────────────────
  // Service Role Key — obbligatorio per aggiornare la tabella orders
  const supabase = getSupabase();

  const { error: updateErr } = await supabase
    .from('orders')
    .update({
      status:             'confirmed',          // pending → confirmed (= paid)
      stripe_payment_id:  session.id,
      stripe_customer_id: customerId,
      stripe_invoice_id:  typeof session.invoice === 'string' ? session.invoice : null,
      payment_currency:   paidCurrency,
      paid_amount:        paidAmount,
      paid_at:            new Date().toISOString(),
      tax_amount:         taxAmount,
      tax_regime:         taxRegime,
    })
    .eq('id', orderId);

  if (updateErr) {
    auditError('payment.status.updated', {
      orderId, reason: updateErr.message, amount: paidAmount, currency: paidCurrency,
    });
    // Non si interrompe: anche se il DB update fallisce, si tenta il log e l'email
  } else {
    audit('payment.status.updated', {
      orderId, status: 'confirmed', amount: paidAmount, currency: paidCurrency,
    });
  }

  // ── Task 5b: Insert audit_logs PAYMENT_RECEIVED ───────────────────────────────
  // Record dedicato per contabilità fiscale — importo e valuta incassati.
  await writePaymentReceivedAudit(supabase, orderId, session.id, paidAmount, paidCurrency, trigger);

  // ── Carica dati ordine per email/PDF ──────────────────────────────────────────
  const { data: orderData } = await (supabase
    .from('orders')
    .select([
      'id', 'created_at', 'customer_name', 'customer_surname', 'customer_email',
      'customer_phone', 'customer_address', 'customer_city', 'customer_cap',
      'customer_country', 'total_amount', 'confirmation_email_sent', 'order_items(*)',
    ].join(', '))
    .eq('id', orderId)
    .single() as unknown as Promise<{ data: OrderQueryRow | null; error: unknown }>);

  if (!orderData) {
    console.error(`[stripe-webhook] Ordine ${orderId} non trovato dopo update — skip email`);
    return;
  }

  // ── Idempotenza ATOMICA (CAS — Compare And Set) ───────────────────────────────
  // RACE CONDITION FIX: il semplice check `if (confirmation_email_sent)` non è sicuro
  // perché due webhook concorrenti possono leggerlo entrambi come `false` e inviare
  // entrambi l'email. La soluzione è un UPDATE atomico con .eq('confirmation_email_sent', false):
  // solo UNO dei due webhook aggiorna la riga, l'altro ottiene count=0 ed esce.
  const { data: casRows } = await supabase
    .from('orders')
    .update({ confirmation_email_sent: true })
    .eq('id', orderId)
    .eq('confirmation_email_sent', false)   // lock ottimistico
    .select('id');

  if (!casRows?.length) {
    console.log(`[stripe-webhook] Email già inviata per ordine ${orderId} — skip (idempotente atomico)`);
    return;
  }

  // ── Locale per affiliate URL ──────────────────────────────────────────────────
  const locale: AmazonLocale =
    orderData.customer_country && MARKETPLACE[orderData.customer_country as AmazonLocale]
      ? (orderData.customer_country as AmazonLocale)
      : 'it';
  const market = MARKETPLACE[locale];

  // ── Prepara item per email ────────────────────────────────────────────────────
  const orderItems = (orderData.order_items ?? []) as OrderItemRow[];
  const emailItems = orderItems.map((item) => {
    const asin = item.product_url ? extractAsinFromUrl(item.product_url) : null;
    return {
      name:     item.product_title ?? '',
      price:    item.quantity > 0
        ? Number((item.price_at_purchase / item.quantity).toFixed(2))
        : item.price_at_purchase,
      quantity: item.quantity,
      asin:     asin ?? null,
    };
  });

  const rawSum         = emailItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const discountAmount = rawSum > orderData.total_amount
    ? Math.round((rawSum - orderData.total_amount) * 100) / 100
    : 0;

  // ── Tactical Deals per pagina CLASSIFIED del PDF ──────────────────────────────
  let tacticalDeals: TacticalDealItem[] = [];
  try {
    const { data: dealsData } = await supabase
      .from('products')
      .select('name, price, product_url')
      .eq('is_budget_king', true)
      .eq('is_active', true)
      .not('product_url', 'is', null)
      .lte('price', 50)
      .order('price', { ascending: true })
      .limit(3);

    if (dealsData) {
      // Ricostruisce ogni URL con locale corretto + valida l'ASIN prima di includerlo nel PDF
      const rawDeals = (dealsData as DealRow[]).filter(
        (d): d is DealRow & { product_url: string } => d.product_url != null,
      );
      tacticalDeals = await Promise.all(rawDeals.map(async (d) => {
        const asin = extractAsinFromUrl(d.product_url);
        let productUrl = d.product_url;
        if (asin) {
          const reachable = await isAsinReachable(asin, locale);
          productUrl = reachable
            ? buildAffiliateUrl(asin, locale)
            : buildSearchUrl(d.name ?? asin, locale);
        }
        return {
          name:       d.name ?? '',
          price:      parseFloat(String(d.price ?? 0)) * 1.2,
          productUrl,
        };
      }));
    }
  } catch { /* non bloccante — PDF generato senza sezione CLASSIFIED */ }

  // ── Email conferma cliente + allegato PDF ─────────────────────────────────────
  if (orderData.customer_email) {
    try {
      await sendOrderConfirmationEmail({
        customerEmail:  orderData.customer_email,
        orderId:        String(orderId),
        customerName:   orderData.customer_name || 'Operatore',
        items:          emailItems,
        totalAmount:    paidAmount,  // importo Stripe — include tax
        discountAmount,
        tacticalDeals,
      });

      audit('email.confirmation.sent', { orderId, email: orderData.customer_email as string });
      // confirmation_email_sent già impostato a true dal CAS atomico sopra

    } catch (emailErr) {
      const errMsg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      auditError('email.confirmation.failed', {
        orderId, email: orderData.customer_email as string, reason: errMsg,
      });

      // Log su notification_logs per retry manuale dall'admin
      try {
        await supabase.from('notification_logs').insert({
          order_id:    String(orderId),
          type:        'confirmation_email',
          recipient:   orderData.customer_email,
          error:       errMsg,
          resolved:    false,
          retry_count: 0,
        });
      } catch { /* non bloccante */ }
    }
  }

  // ── Email admin con riepilogo fiscale ─────────────────────────────────────────
  // Valida ogni ASIN real-time prima di inserirlo nell'email — fallback a URL di ricerca se 404
  type ItemLinkResult = { url: string | null; isFallback: boolean };
  const brokenAsins: string[] = [];

  const itemLinks = await Promise.all(orderItems.map(async (item): Promise<ItemLinkResult> => {
    const asin = item.product_url ? extractAsinFromUrl(item.product_url) : null;
    if (!asin) return { url: item.product_url ?? null, isFallback: false };
    const reachable = await isAsinReachable(asin, locale);
    if (!reachable) {
      brokenAsins.push(asin);
      console.warn(`[stripe-webhook] [ALERT] Link Amazon rotto per ASIN: ${asin}. Procedura di fallback attivata.`);
      // Log su audit_logs per il pannello admin
      void supabase.from('audit_logs').insert({
        event_type: 'AMAZON_LINK_BROKEN',
        severity:   'WARN',
        actor_id:   'STRIPE_WEBHOOK',
        metadata: {
          asin,
          locale,
          order_id:      orderId,
          product_title: item.product_title,
          broken_url:    buildAffiliateUrl(asin, locale),
          recorded_at:   new Date().toISOString(),
        },
      });
      return { url: buildSearchUrl(item.product_title ?? asin, locale), isFallback: true };
    }
    return { url: buildAffiliateUrl(asin, locale), isFallback: false };
  }));

  const itemsHtml = orderItems.map((item, idx) => {
    const { url: localUrl, isFallback } = itemLinks[idx];
    const linkHtml = localUrl
      ? `<a href="${localUrl}" style="color:${isFallback ? '#ff9a3e' : '#00D4FF'};font-size:11px;word-break:break-all;">${localUrl}</a>${isFallback ? '<br><span style="color:#ff9a3e;font-size:10px;">⚠ ASIN non trovato — link di ricerca Amazon</span>' : ''}`
      : '<span style="color:#666;font-size:11px;">N/A</span>';
    return `<tr>
      <td style="padding:6px 0;color:#aaa;vertical-align:top;">${item.product_title}<br>${linkHtml}</td>
      <td style="padding:6px 0;text-align:right;vertical-align:top;">x${item.quantity}</td>
      <td style="padding:6px 0;text-align:right;font-weight:bold;vertical-align:top;">${txSymbol}${(item.price_at_purchase / item.quantity).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const paymentMethodLabel = trigger === 'async'
    ? '⏱ Metodo asincrono (SEPA/iDEAL) — fondi appena incassati'
    : '⚡ Carta — fondi garantiti immediatamente';

  try {
    await sendAdminEmail({
      subject: `✅ Stripe Confermato — Ordine ${String(orderId).slice(0, 8)} [${taxRegime}]`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;background:#111;color:#eee;padding:24px;border-radius:8px;">
          <h2 style="color:#00FF94;margin-top:0;">✅ Pagamento Stripe Confermato</h2>
          <p style="margin:0 0 4px;font-size:12px;color:#22d3ee;">${paymentMethodLabel}</p>
          <p><strong>Ordine:</strong> <span style="font-family:monospace;font-size:12px;">${orderId}</span></p>
          <p><strong>Cliente:</strong> ${orderData.customer_name ?? ''} ${orderData.customer_surname ?? ''}</p>
          ${orderData.customer_email  ? `<p><strong>Email:</strong> ${orderData.customer_email}</p>` : ''}
          ${orderData.customer_phone  ? `<p><strong>Telefono:</strong> ${orderData.customer_phone}</p>` : ''}
          ${orderData.customer_address
            ? `<p><strong>Indirizzo:</strong> ${orderData.customer_address}, ${orderData.customer_cap ?? ''} ${orderData.customer_city ?? ''}</p>`
            : ''}
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            ${itemsHtml}
            <tr style="border-top:1px solid #333;">
              <td colspan="2" style="padding:8px 0;font-weight:bold;text-align:right;">Totale pagato (incl. tax):</td>
              <td style="padding:8px 0;text-align:right;font-weight:bold;color:#00FF94;">${txSymbol}${paidAmount.toFixed(2)}</td>
            </tr>
            ${taxAmount > 0 ? `
            <tr>
              <td colspan="2" style="padding:4px 0;text-align:right;color:#aaa;font-size:12px;">di cui ${taxRegime}:</td>
              <td style="padding:4px 0;text-align:right;color:#22d3ee;font-size:12px;">${txSymbol}${taxAmount.toFixed(2)}</td>
            </tr>` : ''}
          </table>
          <div style="background:#1a1a2e;border:1px solid #333;border-radius:6px;padding:12px;margin-top:12px;">
            <p style="margin:0;font-size:13px;font-weight:bold;">
              ${market.flag} ${market.label}
              <span style="font-weight:normal;color:#aaa;margin-left:8px;">Tag: ${market.tag}</span>
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#22d3ee;">
              Regime: <strong>${taxRegime}</strong> · Valuta: <strong>${paidCurrency}</strong>
              ${session.invoice ? ' · Invoice Stripe generata' : ''}
            </p>
          </div>
          <p style="margin-top:16px;font-size:12px;color:#666;">
            Accedi al pannello admin per procedere con l'evasione ordine.
          </p>
        </div>
      `,
    });
  } catch (adminErr) {
    auditWarn('email.confirmation.failed', {
      orderId, source: 'admin_copy',
      reason: adminErr instanceof Error ? adminErr.message : String(adminErr),
    });
  }

  // ── Alert separato per ASIN rotti (fire-and-forget) ──────────────────────────
  if (brokenAsins.length > 0) {
    sendAdminEmail({
      subject: `🚨 [ALERT] Link Amazon rotti — Ordine ${String(orderId).slice(0, 8)}`,
      html: `
        <div style="font-family:monospace;background:#1a0000;color:#eee;padding:24px;max-width:520px;">
          <h2 style="color:#ff4444;margin-top:0;">🚨 ALERT — LINK AMAZON ROTTI</h2>
          <p><strong>Ordine:</strong> <span style="font-family:monospace;">${orderId}</span></p>
          <p><strong>Marketplace:</strong> ${market.flag} ${market.label} (${locale.toUpperCase()})</p>
          <p style="color:#ff9a3e;font-weight:bold;">ASIN non raggiungibili (HTTP 404):</p>
          <ul>
            ${brokenAsins.map(a => `<li style="margin-bottom:6px;">[ALERT] Link Amazon rotto per ASIN: <strong style="color:#ff4444;">${a}</strong>.<br><span style="color:#aaa;font-size:11px;">Procedura di fallback attivata — link sostituito con ricerca Amazon.</span></li>`).join('')}
          </ul>
          <p style="color:#aaa;font-size:12px;">
            I link prodotto nell'email admin sono stati sostituiti con URL di ricerca Amazon (non danno mai 404).<br>
            Aggiorna gli ASIN nel pannello admin &rarr; Gestione Link.
          </p>
        </div>
      `,
    }).catch(() => {});
  }
}

// ── handlePaymentFailed ───────────────────────────────────────────────────────
//
// checkout.session.async_payment_failed — addebito rifiutato dalla banca del cliente.
// Aggiorna lo stato ordine e invia email recovery con link per riprovare.

async function handlePaymentFailed(session: Stripe.Checkout.Session) {
  const orderId      = session.metadata?.order_id ?? session.metadata?.orderId ?? null;
  const paidCurrency = (session.currency ?? 'eur').toUpperCase();
  const paidAmount   = (session.amount_total ?? 0) / 100;

  auditWarn('payment.stripe.failed', {
    orderId:   orderId ?? undefined,
    paymentId: session.id,
    amount:    paidAmount,
    currency:  paidCurrency,
    status:    session.payment_status,
  });

  if (!orderId) return;

  const supabase = getSupabase();

  await supabase.from('orders')
    .update({ status: 'payment_aborted', payment_currency: paidCurrency })
    .eq('id', orderId);

  // Insert audit_logs per tracciamento fallimenti
  try {
    await supabase.from('audit_logs').insert({
      event_type: 'PAYMENT_FAILED',
      severity:   'WARN',
      actor_id:   'STRIPE_WEBHOOK',
      metadata: {
        order_id:          orderId,
        stripe_session_id: session.id,
        amount:            paidAmount,
        currency:          paidCurrency,
        recorded_at:       new Date().toISOString(),
      },
    });
  } catch (e) {
    console.error('[stripe-webhook] audit_logs PAYMENT_FAILED insert fallito:', (e as Error).message);
  }

  // Email recovery al cliente
  const { data: failedOrder } = await supabase
    .from('orders')
    .select('customer_name, customer_email')
    .eq('id', orderId)
    .single();

  if (failedOrder?.customer_email) {
    const checkoutUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.kitwer26.com'}/checkout`;
    try {
      await sendPaymentFailedEmail({
        customerEmail: failedOrder.customer_email as string,
        customerName:  (failedOrder.customer_name as string | null) ?? 'Operatore',
        orderId:       String(orderId),
        checkoutUrl,
      });
      auditWarn('email.recovery.sent', { orderId, email: failedOrder.customer_email as string });
    } catch (recErr) {
      auditError('email.recovery.failed', {
        orderId,
        reason: recErr instanceof Error ? recErr.message : String(recErr),
      });
    }
  }
}
