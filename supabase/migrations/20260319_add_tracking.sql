-- Migration: Tracking & Amazon Logistics per Kitwer26
-- Eseguire su Supabase SQL Editor

-- Tracking fields
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_number      text,
  ADD COLUMN IF NOT EXISTS carrier_url          text,
  ADD COLUMN IF NOT EXISTS amazon_tracking_link text;

-- Status esteso
-- Assicura che 'payment_aborted' e 'shipped' siano valori accettati
-- (Se usi un ENUM lato DB, aggiungili lì; altrimenti text è già flessibile)

-- Indici
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number      ON orders(tracking_number);
CREATE INDEX IF NOT EXISTS idx_orders_amazon_tracking_link ON orders(amazon_tracking_link);
CREATE INDEX IF NOT EXISTS idx_orders_status               ON orders(status);

COMMENT ON COLUMN orders.tracking_number      IS 'Numero di tracking corriere (legacy)';
COMMENT ON COLUMN orders.carrier_url          IS 'URL diretto tracking corriere (legacy)';
COMMENT ON COLUMN orders.amazon_tracking_link IS 'Link tracking Amazon fornito dallAdmin';

-- Follow-up email 48h post-consegna
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS follow_up_at   timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_sent boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_follow_up
  ON orders(follow_up_at)
  WHERE status = 'delivered' AND follow_up_sent = false;
