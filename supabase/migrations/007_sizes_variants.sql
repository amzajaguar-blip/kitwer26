-- ─────────────────────────────────────────────────────────────
--  007_sizes_variants.sql
--  Aggiunge colonne 'sizes' e 'colors' alla tabella products
--  per supportare varianti generiche (es. "M:20, L:30, XL:40"
--  oppure "900x400mm:35, Vetro Temperato:50, Senza fili")
-- ─────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sizes  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS colors TEXT DEFAULT NULL;

-- Commento esplicativo
COMMENT ON COLUMN products.sizes IS
  'Varianti generiche separate da virgola. Formato opzionale con prezzo: "Nome:Prezzo". Esempi: "M:20, L:30", "900x400mm:35, Vetro Temperato", "Rosso, Verde, Blu"';

COMMENT ON COLUMN products.colors IS
  'Colori separati da virgola. Esempi: "Nero, Bianco, Rosso"';
