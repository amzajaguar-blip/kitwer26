-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  TITAN v2.2 — Kitwer26 Schema Migration                                     ║
-- ║  Run in Supabase SQL Editor. Safe to re-run (idempotent).                    ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- Advisory lock: prevents concurrent runs of this migration
SELECT pg_advisory_xact_lock(20260408);

-- ── 1. Schema additions ────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active   BOOLEAN     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS amazon_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now();

-- Constraint: amazon_price must be positive if set
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS chk_amazon_price_positive;
ALTER TABLE products
  ADD CONSTRAINT chk_amazon_price_positive
    CHECK (amazon_price IS NULL OR amazon_price > 0);

-- ── 2. Normalize: trim whitespace on URL columns ───────────────────────────────

UPDATE products
SET
  affiliate_url = TRIM(affiliate_url),
  image_url     = TRIM(image_url)
WHERE
  affiliate_url IS DISTINCT FROM TRIM(affiliate_url)
  OR image_url  IS DISTINCT FROM TRIM(image_url);

-- ── 3. Populate is_active via MATERIALIZED CTE ────────────────────────────────
-- Strict Amazon URL regex: must start with https://www.amazon.(it|de|fr|es|co.uk|com)/
-- affiliate_url must contain tag=kitwer26-21

WITH product_status AS MATERIALIZED (
  SELECT
    id,
    CASE
      WHEN price IS NULL OR price <= 0
        THEN FALSE
      WHEN affiliate_url IS NULL OR affiliate_url = ''
        THEN FALSE
      WHEN affiliate_url ILIKE '%INSERIRE%'
        THEN FALSE
      WHEN affiliate_url NOT LIKE '%tag=kitwer26-21%'
        THEN FALSE
      WHEN affiliate_url !~ '^https://www\.amazon\.(it|de|fr|es|co\.uk|com)/'
        THEN FALSE
      WHEN image_url IS NULL OR image_url = ''
        THEN FALSE
      WHEN image_url ILIKE '%placeholder%'
        THEN FALSE
      ELSE TRUE
    END AS computed_active
  FROM products
)
UPDATE products p
SET is_active = ps.computed_active
FROM product_status ps
WHERE p.id = ps.id
  AND p.is_active IS DISTINCT FROM ps.computed_active;

-- ── 4. Filtered indices for fast visibility queries ───────────────────────────

CREATE INDEX IF NOT EXISTS idx_products_active
  ON products (id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_active_category
  ON products (category, id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_active_budget_king
  ON products (is_budget_king, price)
  WHERE is_active = TRUE AND is_budget_king = TRUE;

-- ── 5. Self-healing trigger ────────────────────────────────────────────────────
-- Automatically syncs is_active on INSERT or UPDATE of relevant columns.

CREATE OR REPLACE FUNCTION fn_products_sync_active()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.is_active := CASE
    WHEN NEW.price IS NULL OR NEW.price <= 0                         THEN FALSE
    WHEN NEW.affiliate_url IS NULL OR NEW.affiliate_url = ''         THEN FALSE
    WHEN NEW.affiliate_url ILIKE '%INSERIRE%'                        THEN FALSE
    WHEN NEW.affiliate_url NOT LIKE '%tag=kitwer26-21%'              THEN FALSE
    WHEN NEW.affiliate_url !~ '^https://www\.amazon\.(it|de|fr|es|co\.uk|com)/'
                                                                     THEN FALSE
    WHEN NEW.image_url IS NULL OR NEW.image_url = ''                 THEN FALSE
    WHEN NEW.image_url ILIKE '%placeholder%'                         THEN FALSE
    ELSE TRUE
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_sync_active ON products;
CREATE TRIGGER trg_products_sync_active
  BEFORE INSERT OR UPDATE OF price, affiliate_url, image_url
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION fn_products_sync_active();

-- ── 6. Monitoring ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_total    INT;
  v_active   INT;
  v_inactive INT;
  v_no_url   INT;
  v_pct      INT;
BEGIN
  SELECT COUNT(*) INTO v_total    FROM products;
  SELECT COUNT(*) INTO v_active   FROM products WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_inactive FROM products WHERE is_active = FALSE;
  SELECT COUNT(*) INTO v_no_url   FROM products
    WHERE affiliate_url IS NULL OR affiliate_url = '' OR affiliate_url ILIKE '%INSERIRE%';

  v_pct := ROUND((v_active::NUMERIC / NULLIF(v_total, 0)) * 100);

  RAISE NOTICE '════════════════════════════════════════════════════';
  RAISE NOTICE 'TITAN v2.2 Migration Complete';
  RAISE NOTICE '  Total products:   %', v_total;
  RAISE NOTICE '  Active (visible): % (%)', v_active, v_pct || '%';
  RAISE NOTICE '  Inactive:         %', v_inactive;
  RAISE NOTICE '  Missing URL:      %', v_no_url;
  RAISE NOTICE '════════════════════════════════════════════════════';

  IF v_active < (v_total * 0.85) THEN
    RAISE WARNING 'TITAN v2.2: Active coverage below 85%% (% / %). Investigate inactive products.',
      v_active, v_total;
  END IF;
END;
$$;

-- ── 7. Verification query ─────────────────────────────────────────────────────

SELECT
  COUNT(*)                                    AS total_products,
  COUNT(*) FILTER (WHERE is_active = TRUE)    AS active_products,
  COUNT(*) FILTER (WHERE is_active = FALSE)   AS inactive_products,
  ROUND(
    COUNT(*) FILTER (WHERE is_active = TRUE)::NUMERIC
    / NULLIF(COUNT(*), 0) * 100
  )                                           AS active_pct
FROM products;

COMMIT;
