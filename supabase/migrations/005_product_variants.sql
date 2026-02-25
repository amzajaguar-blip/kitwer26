-- ─────────────────────────────────────────────────────────────
--  005_product_variants.sql
--  Sistema varianti prodotto (colori, taglie, switch, ecc.)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_variants (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id     UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Identità variante
  variant_type   TEXT        NOT NULL DEFAULT 'color',  -- 'color' | 'size' | 'switch' | 'other'
  name           TEXT        NOT NULL,                  -- es. "Nero Opaco", "XL", "Red Linear"
  sku            TEXT,                                  -- codice prodotto specifico variante

  -- Colore
  color_hex      TEXT,                                  -- es. "#1a1a1a"  (solo per variant_type = 'color')

  -- Prezzo override (NULL = usa prezzo del prodotto padre)
  price_override NUMERIC(10,2),

  -- Stock
  stock_quantity INTEGER     NOT NULL DEFAULT 0,

  -- Immagine specifica variante (NULL = usa immagine prodotto padre)
  image_url      TEXT,

  -- Ordinamento
  sort_order     INTEGER     NOT NULL DEFAULT 0,

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indice per lookup veloci per prodotto
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants(product_id);

-- Aggiorna updated_at automaticamente
CREATE OR REPLACE FUNCTION update_variant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_variant_updated_at ON product_variants;
CREATE TRIGGER trg_variant_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_variant_timestamp();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Chiunque può leggere le varianti
CREATE POLICY "Public read variants"
  ON product_variants FOR SELECT
  TO anon, authenticated
  USING (true);

-- Solo service_role può scrivere
CREATE POLICY "Service role full access variants"
  ON product_variants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
