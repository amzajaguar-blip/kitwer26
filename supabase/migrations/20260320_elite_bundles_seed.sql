-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Elite Bundles Seed — THERMAL OVERWATCH UNIT + SOVEREIGN COMPUTE NODE
-- Data: 2026-03-20
-- Scopo: Popolare i prodotti necessari per i 2 nuovi bundle elite (margin20).
--        I product_url puntano alle pagine Amazon IT reali usate come fonte.
--
-- BUNDLE 1: [ THERMAL OVERWATCH UNIT ] → category: sicurezza-domotica-high-end
--   Costo Amazon: €349 + €289 + €229 = €867
--   bundlePrice:  €867 / 0.8 = €1,083.75
--   barratoPrice: €1,083.75 × 1.07 = €1,159.61
--
-- BUNDLE 2: [ SOVEREIGN COMPUTE NODE ] → category: pc-hardware-high-ticket
--   Costo Amazon: €1,179 + €549 + €349 = €2,077
--   bundlePrice:  €2,077 / 0.8 = €2,596.25
--   barratoPrice: €2,596.25 × 1.07 = €2,777.99
-- ══════════════════════════════════════════════════════════════════════════════

-- ── THERMAL OVERWATCH UNIT ────────────────────────────────────────────────────

-- Slot 1: Telecamera AI 4K (sub_category: smart-cameras)
INSERT INTO products (
  id, name, category, sub_category, description,
  price, image_url, image_urls, product_url,
  is_budget_king, is_top_tier,
  variants
) VALUES (
  'prod_thermal_cam_arlo5',
  'Arlo Pro 5S 2K — Telecamera WiFi Esterna con AI, Visione Notturna a Colori e Sirena Integrata',
  'sicurezza-domotica-high-end',
  'smart-cameras',
  'Telecamera di sicurezza wireless 2K HDR con rilevamento oggetti basato su IA, visione notturna a colori, sirena da 90 dB integrata e compatibilità con Alexa/Google Home. Batteria da 6 mesi.',
  349.00,
  'https://m.media-amazon.com/images/I/71QJpBc3qbL._AC_SL1500_.jpg',
  ARRAY[
    'https://m.media-amazon.com/images/I/71QJpBc3qbL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/61x8GzFrdKL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/71Vop3DVMXL._AC_SL1500_.jpg'
  ],
  'https://www.amazon.it/dp/B0CLKQ5ZL9',
  false,
  true,
  '[{"name":"Colore","values":["Bianco","Nero"]}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  price        = EXCLUDED.price,
  product_url  = EXCLUDED.product_url,
  image_url    = EXCLUDED.image_url,
  image_urls   = EXCLUDED.image_urls;

-- Slot 2: Sistema Allarme Hub (sub_category: alarm-systems)
INSERT INTO products (
  id, name, category, sub_category, description,
  price, image_url, image_urls, product_url,
  is_budget_king, is_top_tier,
  variants
) VALUES (
  'prod_thermal_alarm_ajax',
  'Ajax StarterKit Plus — Hub Wireless con Sensore PIR, Contatto Porta e Sirena 110 dB',
  'sicurezza-domotica-high-end',
  'alarm-systems',
  'Sistema di allarme professionale wireless: hub central con GSM/Ethernet, sensore di movimento MotionProtect, contatto porta DoorProtect, tastiera KeyPad, sirena HomeSiren 110 dB. Backup batteria 16h.',
  289.00,
  'https://m.media-amazon.com/images/I/71bM+EWGAHL._AC_SL1500_.jpg',
  ARRAY[
    'https://m.media-amazon.com/images/I/71bM+EWGAHL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/61RpkCxbFZL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/51ZWzKjKELL._AC_SL1500_.jpg'
  ],
  'https://www.amazon.it/dp/B07ZSH5V72',
  false,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  price        = EXCLUDED.price,
  product_url  = EXCLUDED.product_url,
  image_url    = EXCLUDED.image_url,
  image_urls   = EXCLUDED.image_urls;

-- Slot 3: Smart Lock Criptato (sub_category: smart-locks)
INSERT INTO products (
  id, name, category, sub_category, description,
  price, image_url, image_urls, product_url,
  is_budget_king, is_top_tier,
  variants
) VALUES (
  'prod_thermal_lock_nuki4',
  'Nuki Smart Lock Pro 4.0 — Serratura Smart con Matter, Thread e Accesso Remoto Criptato',
  'sicurezza-domotica-high-end',
  'smart-locks',
  'Serratura elettronica di ultima generazione con protocollo Matter e Thread per integrazione nativa con Apple Home, Google Home e Alexa. Accesso remoto end-to-end criptato, log di accesso, auto-lock. Nessuna sostituzione del cilindro.',
  229.00,
  'https://m.media-amazon.com/images/I/51sV04RuuQL._AC_SL1000_.jpg',
  ARRAY[
    'https://m.media-amazon.com/images/I/51sV04RuuQL._AC_SL1000_.jpg',
    'https://m.media-amazon.com/images/I/61YVDCKsUkL._AC_SL1000_.jpg',
    'https://m.media-amazon.com/images/I/51fZYpuCGHL._AC_SL1000_.jpg'
  ],
  'https://www.amazon.it/dp/B0CGXHLS5B',
  false,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  price        = EXCLUDED.price,
  product_url  = EXCLUDED.product_url,
  image_url    = EXCLUDED.image_url,
  image_urls   = EXCLUDED.image_urls;

-- ── SOVEREIGN COMPUTE NODE ────────────────────────────────────────────────────

-- Slot 1: GPU Ultra (sub_category: gpus)
INSERT INTO products (
  id, name, category, sub_category, description,
  price, image_url, image_urls, product_url,
  is_budget_king, is_top_tier,
  variants
) VALUES (
  'prod_sovereign_gpu_rtx4080s',
  'ASUS ROG STRIX RTX 4080 SUPER OC — 16GB GDDR6X, DLSS 3.5, DisplayPort 2.1, AI-Grade Compute',
  'pc-hardware-high-ticket',
  'gpus',
  'GPU NVIDIA Ada Lovelace di fascia ultra: 16GB GDDR6X, core clock OC a 2625 MHz, 3× DisplayPort 2.1 + HDMI 2.1, supporto DLSS 3.5 e CUDA per AI/ML workload. Raffreddamento ROG TRI-FAN con dissipatori Axial-tech.',
  1179.00,
  'https://m.media-amazon.com/images/I/81+bXyKxrGL._AC_SL1500_.jpg',
  ARRAY[
    'https://m.media-amazon.com/images/I/81+bXyKxrGL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/71xg4W3RZEL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/71k2Hd7ZZZL._AC_SL1500_.jpg'
  ],
  'https://www.amazon.it/dp/B0CRZCBLLL',
  false,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  price        = EXCLUDED.price,
  product_url  = EXCLUDED.product_url,
  image_url    = EXCLUDED.image_url,
  image_urls   = EXCLUDED.image_urls;

-- Slot 2: CPU High-Freq (sub_category: cpus)
INSERT INTO products (
  id, name, category, sub_category, description,
  price, image_url, image_urls, product_url,
  is_budget_king, is_top_tier,
  variants
) VALUES (
  'prod_sovereign_cpu_i914900k',
  'Intel Core i9-14900K — 24 Core (8P+16E), 6.0 GHz Boost, LGA1700, Unlocked per Overclocking',
  'pc-hardware-high-ticket',
  'cpus',
  'Processore di fascia ultra per workstation e AI: 24 core (8 Performance + 16 Efficiency), clock boost fino a 6.0 GHz, 36 MB cache Intel Smart, supporto DDR5/DDR4, PCIe 5.0. Ideale per rendering, mining, LLM inference.',
  549.00,
  'https://m.media-amazon.com/images/I/61oVMgDhZrL._AC_SL1500_.jpg',
  ARRAY[
    'https://m.media-amazon.com/images/I/61oVMgDhZrL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/71K5b0nwIQL._AC_SL1500_.jpg'
  ],
  'https://www.amazon.it/dp/B0CGJKWGD6',
  false,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  price        = EXCLUDED.price,
  product_url  = EXCLUDED.product_url,
  image_url    = EXCLUDED.image_url,
  image_urls   = EXCLUDED.image_urls;

-- Slot 3: RAM DDR5 64GB (sub_category: memory)
INSERT INTO products (
  id, name, category, sub_category, description,
  price, image_url, image_urls, product_url,
  is_budget_king, is_top_tier,
  variants
) VALUES (
  'prod_sovereign_ram_dominator64',
  'Corsair DOMINATOR PLATINUM RGB DDR5 — 64GB Kit (2×32GB) 6200MHz, XMP 3.0, Dissipatore DHAX',
  'pc-hardware-high-ticket',
  'memory',
  'Kit RAM DDR5 dual-channel ad alte prestazioni: 64GB (2×32GB), 6200MHz con XMP 3.0 per overclock automatico su piattaforme Intel e AMD. Dissipatore DHAX con 12 LED RGB indirizzabili. Latenza CL36.',
  349.00,
  'https://m.media-amazon.com/images/I/71B3F5+NCAL._AC_SL1500_.jpg',
  ARRAY[
    'https://m.media-amazon.com/images/I/71B3F5+NCAL._AC_SL1500_.jpg',
    'https://m.media-amazon.com/images/I/61JNrJ6HMVL._AC_SL1500_.jpg'
  ],
  'https://www.amazon.it/dp/B0C4TX6H5Z',
  false,
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name         = EXCLUDED.name,
  price        = EXCLUDED.price,
  product_url  = EXCLUDED.product_url,
  image_url    = EXCLUDED.image_url,
  image_urls   = EXCLUDED.image_urls;

-- ── Commento riepilogativo ─────────────────────────────────────────────────────
-- Dopo aver eseguito questa migration, verificare in Supabase Table Editor che:
--   1. products con sub_category IN ('smart-cameras','alarm-systems','smart-locks')
--      abbiano category = 'sicurezza-domotica-high-end'
--   2. products con sub_category IN ('gpus','cpus','memory')
--      abbiano category = 'pc-hardware-high-ticket'
--   3. Tutti i product_url puntino a pagine Amazon IT valide
--      (usate dall'admin dashboard per il tasto [ AMAZON ])
