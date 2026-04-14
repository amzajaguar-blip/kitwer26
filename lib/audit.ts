/**
 * lib/audit.ts — Centralized Audit Logging Engine (Task 2)
 *
 * Rules:
 *  - NEVER log raw credentials, tokens, or passwords
 *  - Email addresses are masked (first 2 chars + domain only)
 *  - Payment/order IDs are truncated (first 6–8 chars)
 *  - DB writes are fire-and-forget — never block the request
 *  - Silently degrades to console-only if Supabase env is missing
 *
 * Compatible with Edge Runtime (no Node.js APIs used).
 */

// ── Event type taxonomy ────────────────────────────────────────────────────────

export type AuditEventName =
  | 'auth.config.missing'
  | 'auth.login.success'
  | 'auth.login.failed'
  | 'auth.session.missing'
  | 'auth.session.invalid'
  | 'auth.session.valid'
  | 'payment.webhook.received'
  | 'payment.webhook.invalid_format'
  | 'payment.status.updated'
  | 'payment.verified'
  | 'payment.verify.no_id'
  | 'email.confirmation.sent'
  | 'email.confirmation.failed'
  | 'email.recovery.sent'
  | 'email.recovery.failed';
  // Removed: affiliate-only model — payment.stripe.* events no longer applicable

export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

/** Maps internal event names → DB event_type categories. */
const EVENT_CATEGORY: Record<AuditEventName, string> = {
  'auth.config.missing':            'CRITICAL_ERROR',
  'auth.login.success':             'AUTH_SUCCESS',
  'auth.login.failed':              'AUTH_FAILURE',
  'auth.session.missing':           'AUTH_FAILURE',
  'auth.session.invalid':           'AUTH_FAILURE',
  'auth.session.valid':             'AUTH_SUCCESS',
  'payment.webhook.received':       'PAYMENT_INITIATED',
  'payment.webhook.invalid_format': 'AUTH_FAILURE',
  'payment.status.updated':         'SYSTEM_EVENT',
  'payment.verified':               'PAYMENT_COMPLETED',
  'payment.verify.no_id':           'PAYMENT_FAILED',
  'email.confirmation.sent':        'BUNDLE_PURCHASE',
  'email.confirmation.failed':      'CRITICAL_ERROR',
  'email.recovery.sent':                 'PAYMENT_FAILED',
  'email.recovery.failed':               'CRITICAL_ERROR',
  // Removed: affiliate-only model — payment.stripe.* events deleted
};

// ── Context ────────────────────────────────────────────────────────────────────

type AuditValue = string | number | boolean | undefined;

export interface AuditContext {
  path?:      string;
  orderId?:   string;
  paymentId?: string;
  status?:    string;
  reason?:    string;
  email?:     string;
  source?:    string;
  /** Importo transazione — non è PII, non viene sanitizzato. */
  amount?:    number;
  /** Codice ISO valuta transazione (EUR | GBP | USD). Fondamentale per ledger fiscale. */
  currency?:  string;
  /** Anonymized IP — first 16 hex chars of SHA-256(raw_ip). Never the raw IP. */
  ip_hash?:   string;
  /** actor_id override. Defaults to 'SYSTEM'. */
  actor?:     string;
  [key: string]: AuditValue;
}

// ── Sanitization ───────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const atIdx = email.indexOf('@');
  if (atIdx < 2) return '***@***';
  return `${email.slice(0, 2)}***@${email.slice(atIdx + 1)}`;
}

function sanitize(ctx: AuditContext): Omit<AuditContext, 'actor'> {
  const safe: AuditContext = { ...ctx };
  if (typeof safe.email     === 'string') safe.email     = maskEmail(safe.email);
  if (typeof safe.paymentId === 'string') safe.paymentId = `${safe.paymentId.slice(0, 6)}***`;
  if (typeof safe.orderId   === 'string') safe.orderId   = `${safe.orderId.slice(0, 8)}***`;
  // actor is used for actor_id DB field, not stored in metadata
  delete safe.actor;
  return safe;
}

// ── Console formatter ──────────────────────────────────────────────────────────

function build(event: AuditEventName, ctx: AuditContext): string {
  return `[AUDIT] ${event} ${JSON.stringify({
    ts: new Date().toISOString(),
    ...sanitize(ctx),
  })}`;
}

// ── DB persistence (fire-and-forget) ─────────────────────────────────────────

/**
 * Async write to audit_logs via Supabase REST API.
 * Uses globalThis.fetch for Edge Runtime compatibility.
 * All errors are swallowed — logging must never throw or block.
 */
function persistLog(
  event:    AuditEventName,
  severity: AuditSeverity,
  ctx:      AuditContext,
): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;

  const actor_id = ctx.actor ?? 'SYSTEM';

  globalThis.fetch(`${url}/rest/v1/audit_logs`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        key,
      'Authorization': `Bearer ${key}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      event_type: EVENT_CATEGORY[event],
      severity,
      metadata:   { event, ...sanitize(ctx) },
      actor_id,
    }),
  }).catch(() => {}); // silent — must never throw
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function audit(event: AuditEventName, ctx: AuditContext = {}): void {
  console.log(build(event, ctx));
  persistLog(event, 'INFO', ctx);
}

export function auditWarn(event: AuditEventName, ctx: AuditContext = {}): void {
  console.warn(build(event, ctx));
  persistLog(event, 'WARN', ctx);
}

export function auditError(event: AuditEventName, ctx: AuditContext = {}): void {
  console.error(build(event, ctx));
  persistLog(event, 'CRITICAL', ctx);
}
