/**
 * lib/schemas.ts — Zod Schemas per Type Safety a Runtime
 *
 * Usati per validare risposte API esterne (Stripe, Supabase) prima
 * che i dati raggiungano la UI o la business logic.
 */

import { z } from 'zod';

// ── Product ───────────────────────────────────────────────────────────────────

export const ProductSchema = z.object({
  id:           z.union([z.string(), z.number()]).transform(String).optional(),
  name:         z.string().min(1),
  category:     z.string().optional().nullable(),
  sub_category: z.string().optional().nullable(),
  description:  z.string().optional().nullable(),
  image_url:    z.string().url().optional().nullable(),
  image_urls:   z.array(z.string().url()).optional().nullable(),
  product_url:  z.string().url().optional().nullable(),
  price:        z.union([z.string(), z.number()]).optional().nullable(),
  is_budget_king:    z.boolean().optional().nullable(),
  is_price_pending:  z.boolean().optional().nullable(),
});

export type ValidatedProduct = z.infer<typeof ProductSchema>;

// ── Order Item ────────────────────────────────────────────────────────────────

export const OrderItemSchema = z.object({
  id:                 z.string().optional(),
  order_id:           z.string().optional(),
  product_title:      z.string().optional().nullable(),
  product_url:        z.string().optional().nullable(),
  quantity:           z.number().int().positive(),
  price_at_purchase:  z.number().nonnegative(),
});

// ── Order ─────────────────────────────────────────────────────────────────────

export const OrderSchema = z.object({
  id:                       z.string(),
  created_at:               z.string().optional().nullable(),
  status:                   z.enum([
    'pending',
    'pending_stripe_payment',  // Stripe Checkout Session creata, in attesa pagamento
    'confirmed',
    'cancelled',
    'payment_aborted',
    'shipped',
    'delivered',
    'stripe_error',            // Stripe Checkout Session fallita
  ]),
  customer_name:            z.string().optional().nullable(),
  customer_surname:         z.string().optional().nullable(),
  customer_email:           z.string().email().optional().nullable(),
  customer_phone:           z.string().optional().nullable(),
  customer_address:         z.string().optional().nullable(),
  customer_city:            z.string().optional().nullable(),
  customer_cap:             z.string().optional().nullable(),
  customer_country:         z.string().optional().nullable(),
  total_amount:             z.number().nonnegative(),
  confirmation_email_sent:  z.boolean().optional().nullable(),
  tracking_number:          z.string().optional().nullable(),
  carrier_url:              z.string().url().optional().nullable(),
  order_items:              z.array(OrderItemSchema).optional(),
});

export type ValidatedOrder = z.infer<typeof OrderSchema>;

/** All valid order status values (derived from schema — single source of truth). */
export type OrderStatus = z.infer<typeof OrderSchema>['status'];

// ── DB Row Types ──────────────────────────────────────────────────────────────

/** Shape of an order_items row as returned by Supabase select queries. */
export interface OrderItemRow {
  product_title:     string | null;
  product_url:       string | null;
  quantity:          number;
  price_at_purchase: number;
}

/** Shape of a products row selected for tactical deals. */
export interface DealRow {
  name:        string | null;
  price:       number | null;
  product_url: string | null;
}

// ── Helper: safe parse con log ─────────────────────────────────────────────────

export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  label: string,
): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[schema:${label}] Validazione fallita:`, result.error.flatten());
    return null;
  }
  return result.data;
}
