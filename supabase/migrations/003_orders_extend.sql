-- ============================================================
-- Kitwer26 — Orders Table Extension
-- Aggiunge: customer_phone, tracking_id, estimated_delivery
-- Aggiorna: payment_status CHECK per includere 'purchased' e 'shipped'
-- Esegui nel Supabase SQL Editor
-- ============================================================

-- Aggiungi customer_phone (mancava — era solo in Mollie metadata)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';

-- Aggiungi tracking_id per la spedizione
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_id TEXT;

-- Aggiungi estimated_delivery (es. "7-12 giorni lavorativi")
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estimated_delivery TEXT NOT NULL DEFAULT '7-12 giorni lavorativi';

-- Aggiorna il CHECK su payment_status per includere i nuovi stati
-- 1. Rimuovi il vecchio constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- 2. Ricrea con i nuovi valori
ALTER TABLE orders
  ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('open', 'paid', 'failed', 'purchased', 'shipped'));
