-- ================================================================
-- 006_seed_boom_products.sql  (idempotente — safe to re-run)
-- Seed: 10 prodotti BOOM con varianti colore
-- ⚠ Esegui DOPO 005_product_variants.sql
-- ================================================================

DO $$
DECLARE
  p_tast60    UUID;
  p_tast75    UUID;
  p_tastTKL   UUID;
  p_mouse60   UUID;
  p_mouseErgo UUID;
  p_mouse8k   UUID;
  p_cuffie    UUID;
  p_mic       UUID;
  p_pad       UUID;
  p_cavi      UUID;

BEGIN

-- ─────────────────────────────────────────────────────────────
-- TASTIERE
-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Tastiera Meccanica 60% Wireless',
  'tastiera-meccanica-60-wireless',
  'Design ultra-compatto al 60% con switch hot-swap sostituibili in secondi. Connessione wireless a bassa latenza per gaming senza fili. Retroilluminazione RGB personalizzabile. Layout ridotto per più spazio al mouse e postura corretta.',
  '', 59.90, 89.90, 'Tastiere', true,
  '{"switch":"Hot-Swap (pre-installati Red Linear)","layout":"60%","connessione":"Wireless 2.4GHz + USB-C cablato","retroilluminazione":"RGB per-tasto","autonomia":"72 ore (RGB off: 200 ore)","materiale":"ABS premium + cornice in alluminio"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  price_original = EXCLUDED.price_original,
  specs = EXCLUDED.specs
RETURNING id INTO p_tast60;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_tast60) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_tast60, 'color', 'Nero Opaco',      '#1A1A1A', 15, 1),
    (p_tast60, 'color', 'Bianco Ghiaccio', '#F5F5F0', 10, 2),
    (p_tast60, 'color', 'Grigio Spazio',   '#4A4D52',  8, 3);
END IF;

-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Tastiera RGB 75% Compact Tenkeyless',
  'tastiera-rgb-75-compact-tenkeyless',
  'Formato 75% con tasti freccia dedicati e layout compatto che non rinuncia alle funzioni essenziali. Switch meccanici Brown tattili per un feedback preciso in gaming e typing. Doppio layer di suono con foam interno.',
  '', 49.90, 69.90, 'Tastiere', true,
  '{"switch":"Brown Tattile","layout":"75% Tenkeyless","connessione":"USB-C","retroilluminazione":"RGB per-tasto","foam_interno":true,"materiale":"Double-shot PBT keycaps"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_tast75;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_tast75) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_tast75, 'color', 'Nero Gunmetal', '#2C2C2E', 20, 1),
    (p_tast75, 'color', 'Rosa Sakura',   '#F4A7B9', 12, 2);
END IF;

-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Tastiera Meccanica TKL Full RGB Pro',
  'tastiera-meccanica-tkl-rgb-pro',
  'Tastiera tenkeyless professionale con switch Red Linear silenziosi per sessioni di gaming intense. Struttura in alluminio spazzolato con peso di ancoraggio anti-slip. Retroilluminazione RGB con 16 effetti preimpostati.',
  '', 74.90, 109.90, 'Tastiere', true,
  '{"switch":"Red Linear Silent","layout":"TKL (87 tasti)","connessione":"USB-C detachable","retroilluminazione":"RGB 16 effetti","scocca":"Alluminio spazzolato","keycaps":"PBT Double-shot"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_tastTKL;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_tastTKL) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_tastTKL, 'color', 'Argento Alluminio', '#C0C0C0', 10, 1),
    (p_tastTKL, 'color', 'Nero Midnight',     '#0D0D0D', 18, 2),
    (p_tastTKL, 'color', 'Bianco Arctic',     '#FAFAFA',  6, 3);
END IF;

-- ─────────────────────────────────────────────────────────────
-- MOUSE
-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Mouse Wireless Ultraleggero 60g Gaming',
  'mouse-wireless-ultraleggero-60g',
  'Progettato per i pro degli eSports. Scocca forata honeycomb che azzera il surriscaldamento della mano. Sensore da 26.000 DPI con tracking perfetto anche a 400 IPS. Zero lag con il ricevitore USB 2.4GHz.',
  '', 49.90, 79.90, 'Mouse', true,
  '{"sensore":"26.000 DPI ottico","peso":"60g","design":"Honeycomb forato","connessione":"Wireless 2.4GHz + Bluetooth","polling_rate":"1000Hz","autonomia":"70 ore","click":"Omron 60M cicli"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_mouse60;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_mouse60) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_mouse60, 'color', 'Nero',            '#111111', 25, 1),
    (p_mouse60, 'color', 'Bianco',          '#F0F0F0', 15, 2),
    (p_mouse60, 'color', 'Rosa (Pink Ed.)', '#F9A8D4',  8, 3);
END IF;

-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Mouse Gaming Ergonomico Honeycomb',
  'mouse-gaming-ergonomico-honeycomb',
  'Forma ergonomica per mano destra studiata per ridurre la fatica nelle sessioni lunghe. Scocca in plastica forata con rivestimento soft-touch anti-impronta. 7 tasti programmabili con software dedicato.',
  '', 39.90, 59.90, 'Mouse', true,
  '{"sensore":"12.000 DPI","peso":"78g","design":"Ergonomico mano destra","tasti":"7 programmabili","connessione":"USB-A cablato","cavo":"Paracord 1.8m","polling_rate":"500Hz"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_mouseErgo;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_mouseErgo) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_mouseErgo, 'color', 'Nero Opaco',  '#1C1C1E', 30, 1),
    (p_mouseErgo, 'color', 'Grigio Fumo', '#636366', 12, 2);
END IF;

-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Mouse Ambidestro 8K Polling Rate',
  'mouse-ambidestro-8k-polling-rate',
  'Il mouse ambidestro definitivo per chi vuole il massimo delle prestazioni. Polling rate a 8000Hz per risposta istantanea ai movimenti. Sensore HERO con tracking perfetto su qualsiasi superficie. Forma simmetrica compatibile con entrambe le mani.',
  '', 69.90, 99.90, 'Mouse', true,
  '{"sensore":"HERO 25.600 DPI","polling_rate":"8000Hz","peso":"95g","design":"Ambidestro simmetrico","connessione":"Wireless 2.4GHz LIGHTSPEED","autonomia":"140 ore","materiale":"PTFE feet pre-installati"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_mouse8k;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_mouse8k) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_mouse8k, 'color', 'Nero',         '#000000', 20, 1),
    (p_mouse8k, 'color', 'Bianco Latte', '#FFFBF0', 10, 2),
    (p_mouse8k, 'color', 'Navy Blue',    '#1E3A5F',  5, 3);
END IF;

-- ─────────────────────────────────────────────────────────────
-- AUDIO
-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Cuffie Gaming USB 7.1 Surround Sound',
  'cuffie-gaming-usb-71-surround',
  'Audio surround virtuale 7.1 per sentire ogni passo nemico prima che arrivi. Driver da 50mm con frequenza da 20Hz a 20kHz. Microfono cardioid estraibile con filtro pop integrato. Archetto con cuscinetti in memory foam per sessioni di 8+ ore.',
  '', 44.90, 69.90, 'Audio', true,
  '{"driver":"50mm neodimio","risposta_freq":"20Hz-20kHz","surround":"7.1 virtuale USB","microfono":"Cardioide estraibile -38dBV/Pa","connessione":"USB-A","cuscinetti":"Memory foam 55mm","peso":"310g"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_cuffie;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_cuffie) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_cuffie, 'color', 'Nero/Rosso', '#8B0000', 20, 1),
    (p_cuffie, 'color', 'Nero/Blu',   '#003087', 15, 2),
    (p_cuffie, 'color', 'All Black',  '#111111', 18, 3);
END IF;

-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Microfono USB Cardioide da Streaming',
  'microfono-usb-cardioide-streaming',
  'Voce cristallina per streaming, podcast e gaming. Pattern polare cardioide per captare solo la tua voce e ignorare il rumore dell ambiente. Collegamento plug-and-play USB-C, nessun driver necessario. Base antivibrazioni in alluminio inclusa.',
  '', 54.90, 79.90, 'Audio', true,
  '{"pattern":"Cardioide","frequenza":"20Hz-20kHz","sample_rate":"96kHz/24bit","connessione":"USB-C","drivers":"Plug-and-play (nessun driver)","base":"Antivibrazioni inclusa","filtro":"Pop filter magnetico incluso"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_mic;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_mic) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_mic, 'color', 'Nero Opaco',    '#1A1A1A', 15, 1),
    (p_mic, 'color', 'Bianco Polare', '#F8F8F8',  8, 2);
END IF;

-- ─────────────────────────────────────────────────────────────
-- ACCESSORI
-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Mousepad XXL Topografico 90×40cm',
  'mousepad-xxl-topografico-90x40',
  'Superficie speed premium per movimenti ultra-fluidi del mouse. Texture topografica micro-tessuta ottimizzata per sensori ottici e laser. Base in gomma naturale antiscivolo da 4mm. Bordi cuciti anti-sfaldamento.',
  '', 29.90, 44.90, 'Accessori', true,
  '{"dimensioni":"90×40cm","spessore":"4mm","superficie":"Micro-tessuto speed","base":"Gomma naturale antiscivolo","bordi":"Cuciti anti-sfaldamento","compatibilita":"Ottico e laser"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_pad;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_pad) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_pad, 'color', 'Nero/Bianco', '#EEEEEE', 35, 1),
    (p_pad, 'color', 'Nero/Rosso',  '#C0392B', 20, 2),
    (p_pad, 'color', 'Nero/Viola',  '#6C3483', 10, 3);
END IF;

-- ─────────────────────────────────────────────────────────────

INSERT INTO products (title, slug, description, image_url, price_current, price_original, category, is_direct_sell, specs)
VALUES (
  'Kit Cavi USB-C Braided Colorati (3 pz)',
  'kit-cavi-usb-c-braided-colorati',
  'Set da 3 cavi USB-C in nylon intrecciato per un setup senza grovigli. Compatibili con tastiere, controller e dispositivi di ricarica. Connettori dorati 24K per massima conduttività. Disponibili in combinazioni colore matching con la tua postazione.',
  '', 19.90, 29.90, 'Accessori', true,
  '{"contenuto":"3 cavi USB-C","lunghezze":"0.5m / 1m / 1.8m","materiale":"Nylon braided","connettori":"Dorati 24K","compatibilita":"USB 2.0 / 3.1 Gen1","carica":"Fino a 60W PD"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  price_current = EXCLUDED.price_current,
  specs = EXCLUDED.specs
RETURNING id INTO p_cavi;

IF NOT EXISTS (SELECT 1 FROM product_variants WHERE product_id = p_cavi) THEN
  INSERT INTO product_variants (product_id, variant_type, name, color_hex, stock_quantity, sort_order) VALUES
    (p_cavi, 'color', 'Nero + Grigio', '#555555', 40, 1),
    (p_cavi, 'color', 'Bianco + Gold', '#D4AF37', 25, 2),
    (p_cavi, 'color', 'Rosa + Viola',  '#9B59B6', 15, 3);
END IF;

END;
$$;
