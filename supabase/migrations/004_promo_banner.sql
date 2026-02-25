-- ============================================================
-- Kitwer26 — Banner Promo interno (sostituisce AdSense)
-- Esegui nel Supabase SQL Editor
-- ============================================================

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS promo_banner_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_banner_image      TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS promo_banner_link       TEXT    NOT NULL DEFAULT '/',
  ADD COLUMN IF NOT EXISTS promo_banner_text       TEXT    NOT NULL DEFAULT '';
