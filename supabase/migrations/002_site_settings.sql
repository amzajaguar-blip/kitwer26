-- ============================================================
-- Kitwer26 — Site Settings (God Mode CMS)
-- Esegui nel Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  logo_url      TEXT NOT NULL DEFAULT '',
  hero_title    TEXT NOT NULL DEFAULT 'Il Setup dei Tuoi Sogni',
  hero_subtitle TEXT NOT NULL DEFAULT 'Periferiche premium per veri gamer. Confrontiamo i migliori prezzi su mouse, monitor, tastiere e tutto il gear che ti serve.',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_single_row CHECK (id = 1)
);

-- Riga di default (non sovrascrive se già esiste)
INSERT INTO site_settings (id, logo_url, hero_title, hero_subtitle)
VALUES (
  1,
  '',
  'Il Setup dei Tuoi Sogni',
  'Periferiche premium per veri gamer. Confrontiamo i migliori prezzi su mouse, monitor, tastiere e tutto il gear che ti serve.'
)
ON CONFLICT (id) DO NOTHING;

-- Trigger auto-update updated_at
-- NB: la funzione update_updated_at() deve già esistere (creata nello schema principale)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'site_settings_updated_at'
  ) THEN
    CREATE TRIGGER site_settings_updated_at
      BEFORE UPDATE ON site_settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Politica lettura pubblica
-- NB: PostgreSQL non supporta "CREATE POLICY IF NOT EXISTS"
-- Usiamo il blocco DO/EXCEPTION per ignorare se esiste già
DO $$
BEGIN
  CREATE POLICY "Site settings viewable by everyone"
    ON site_settings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- policy già presente, ignora
END $$;

DO $$
BEGIN
  CREATE POLICY "Service role full access site_settings"
    ON site_settings FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
