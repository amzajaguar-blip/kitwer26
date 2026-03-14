-- ═══════════════════════════════════════════════════════════════════════════
--  KITWER — Script SQL per Supabase
--  Esegui tutto questo nel SQL Editor di Supabase (una sola volta)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Tabella ORDERS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  status           TEXT          DEFAULT 'pending'
                                 CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  total_amount     NUMERIC(10,2) NOT NULL,
  tracking_code    TEXT,

  -- Dati spedizione cliente
  customer_name    TEXT NOT NULL,
  customer_surname TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_cap     TEXT NOT NULL,
  customer_city    TEXT NOT NULL,
  customer_phone   TEXT NOT NULL,
  customer_email   TEXT
);

-- ── Tabella ORDER_ITEMS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ   DEFAULT NOW(),
  order_id          UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        TEXT,
  product_title     TEXT          NOT NULL,
  product_variant   TEXT,
  quantity          INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_purchase NUMERIC(10,2) NOT NULL,
  product_url       TEXT          -- 🔒 Link fornitore — solo admin
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ── SE LE TABELLE ESISTONO GIÀ: aggiungi le colonne mancanti ────────────────
-- (IF NOT EXISTS: sicuro da eseguire anche se la colonna c'è già)

ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_cap     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_city    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_surname TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_country TEXT; -- Locale marketplace (it, de, fr, es, uk, us)

-- ── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Clienti anonimi: solo INSERT
CREATE POLICY IF NOT EXISTS "anon_insert_orders"
  ON orders FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "anon_insert_order_items"
  ON order_items FOR INSERT TO anon WITH CHECK (true);

-- Admin (autenticati): SELECT + UPDATE
CREATE POLICY IF NOT EXISTS "auth_read_orders"
  ON orders FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "auth_read_order_items"
  ON order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "auth_update_orders"
  ON orders FOR UPDATE TO authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
--  SICUREZZA: product_url contiene link fornitore.
--  RLS garantisce che solo utenti autenticati (admin) possano leggerlo.
--  Mai selezionato nelle query pubbliche del sito.
-- ═══════════════════════════════════════════════════════════════════════════
