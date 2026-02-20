/**
 * Seed Script - 10 Prodotti Hero per il lancio
 *
 * Esegui con:
 *   npx tsx scripts/seed-gaming.ts
 *
 * Requisiti:
 *   - NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   - Tabelle create con supabase/schema.sql
 */

import { createClient } from '@supabase/supabase-js'
import type { ProductInsert } from '../types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(supabaseUrl, serviceKey)

const products: ProductInsert[] = [
  // 1. Monitor
  {
    title: 'LG UltraGear 27GP850-B 27" QHD 165Hz',
    slug: 'lg-ultragear-27gp850-b',
    description: 'Monitor gaming Nano IPS da 27 pollici con risoluzione QHD (2560x1440), 165Hz, 1ms GtG, HDR400, compatibile G-Sync e FreeSync Premium. Il pannello Nano IPS offre colori vividi con copertura DCI-P3 del 98%.',
    image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600',
    price_current: 349.99,
    price_original: 449.99,
    currency: 'EUR',

    category: 'Monitor 144hz',
    specs: { panel_type: 'Nano IPS', resolution: '2560x1440', refresh_rate: '165Hz', response_time: '1ms GtG', size: '27"', connectivity: 'HDMI 2.0 x2, DP 1.4', backlight: 'HDR400' },
    meta_title: 'LG UltraGear 27GP850 - Miglior Monitor Gaming QHD 2024',
    meta_description: 'Monitor gaming LG UltraGear 27" QHD 165Hz Nano IPS. Colori incredibili, 1ms di risposta. Perfetto per FPS competitivi e RPG.',
  },
  // 2. Mouse
  {
    title: 'Logitech G Pro X Superlight 2',
    slug: 'logitech-g-pro-x-superlight-2',
    description: 'Il mouse wireless più leggero di Logitech per il gaming competitivo. Sensore HERO 2 da 44K DPI, 95 ore di batteria, solo 60g di peso. Usato dai pro player di tutto il mondo.',
    image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600',
    price_current: 139.99,
    price_original: 169.99,
    currency: 'EUR',

    category: 'Mouse',
    specs: { dpi: 44000, polling_rate: '2000Hz', weight_g: 60, connectivity: 'Wireless LIGHTSPEED', battery_life: '95 ore', switch_type: 'LIGHTFORCE Hybrid' },
    meta_title: 'Logitech G Pro X Superlight 2 - Mouse Pro Gaming Wireless',
    meta_description: 'Logitech G Pro X Superlight 2: solo 60g, sensore HERO 2 44K DPI, 95h batteria. Il mouse dei campioni esport.',
  },
  // 3. Tastiera
  {
    title: 'Keychron Q1 Pro - Custom Mechanical',
    slug: 'keychron-q1-pro',
    description: 'Tastiera meccanica custom 75% in alluminio CNC. Hot-swappable, layout QMK/VIA programmabile, guarnizione Gasket Mount per un suono premium. Doppia connessione Bluetooth 5.1 e USB-C.',
    image_url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600',
    price_current: 189.00,
    price_original: 219.00,
    currency: 'EUR',

    category: 'Tastiera',
    specs: { layout: '75%', switch_type: 'Gateron Jupiter Banana', hot_swappable: true, connectivity: 'Bluetooth 5.1 + USB-C', keycaps: 'Double-shot PBT', backlight: 'RGB South-facing' },
    meta_title: 'Keychron Q1 Pro - Tastiera Meccanica Custom Premium',
    meta_description: 'Keychron Q1 Pro: tastiera meccanica 75% in alluminio, hot-swap, QMK/VIA. Il punto d\'ingresso perfetto nel mondo custom.',
  },
  // 4. Microfono
  {
    title: 'Shure SM7B - Microfono Dinamico',
    slug: 'shure-sm7b',
    description: 'Lo standard industriale per streaming, podcast e voice-over. Microfono dinamico cardioide con eccellente rejection del rumore ambientale. Usato da Joe Rogan, MrBeast e migliaia di streamer.',
    image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600',
    price_current: 359.00,
    price_original: 399.00,
    currency: 'EUR',

    category: 'Microfono',
    specs: { polar_pattern: 'Cardioide', frequency_response: '50Hz - 20kHz', connectivity: 'XLR', weight_g: 766 },
    meta_title: 'Shure SM7B - Il Microfono degli Streamer Professionisti',
    meta_description: 'Shure SM7B: il microfono dinamico più usato da streamer e podcaster professionisti. Qualità broadcast, zero rumore.',
  },
  // 5. GPU
  {
    title: 'NVIDIA GeForce RTX 4070 Super',
    slug: 'nvidia-rtx-4070-super',
    description: 'La GPU sweet-spot per il gaming 1440p. Architettura Ada Lovelace, 12GB GDDR6X, DLSS 3.5 con Frame Generation. Ray tracing di nuova generazione per un realismo incredibile.',
    image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600',
    price_current: 599.99,
    price_original: 649.99,
    currency: 'EUR',

    category: 'GPU',
    specs: { vram: '12GB GDDR6X', cuda_cores: 7168, boost_clock: '2475 MHz', tdp: '220W', connectivity: 'HDMI 2.1, DP 1.4a x3' },
    meta_title: 'RTX 4070 Super - La Migliore GPU per Gaming 1440p',
    meta_description: 'NVIDIA RTX 4070 Super: 12GB GDDR6X, DLSS 3.5, Ray Tracing. La scelta perfetta per giocare in QHD a 144+ FPS.',
  },
  // 6. Cuffie
  {
    title: 'SteelSeries Arctis Nova Pro Wireless',
    slug: 'steelseries-arctis-nova-pro-wireless',
    description: 'Le cuffie wireless premium per il gaming. Audio hi-fi con driver planari Almag, ANC attivo, doppia batteria hot-swap per gaming infinito. Connessione simultanea a PC e telefono.',
    image_url: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=600',
    price_current: 299.99,
    price_original: 379.99,
    currency: 'EUR',

    category: 'Cuffie',
    specs: { connectivity: '2.4GHz + Bluetooth', weight_g: 338, battery_life: '22h + hot-swap', frequency_response: '10Hz - 40kHz' },
    meta_title: 'SteelSeries Arctis Nova Pro Wireless - Cuffie Gaming Premium',
    meta_description: 'Arctis Nova Pro Wireless: ANC, dual battery, audio hi-fi. Le migliori cuffie wireless per gaming e streaming.',
  },
  // 7. Webcam
  {
    title: 'Elgato Facecam Pro 4K60',
    slug: 'elgato-facecam-pro-4k60',
    description: 'La prima webcam al mondo con streaming 4K a 60fps. Sensore Sony STARVIS 2, ultra-wide f/1.7, autofocus velocissimo. Qualità cinematografica per i tuoi stream.',
    image_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600',
    price_current: 249.99,
    price_original: 299.99,
    currency: 'EUR',

    category: 'Webcam',
    specs: { resolution: '4K 60fps', connectivity: 'USB-C', size: '81 x 48mm' },
    meta_title: 'Elgato Facecam Pro - Webcam 4K60 per Streamer',
    meta_description: 'Elgato Facecam Pro: prima webcam 4K 60fps al mondo. Sensore Sony, f/1.7. Qualità cinema per il tuo stream.',
  },
  // 8. Stream Deck
  {
    title: 'Elgato Stream Deck MK.2',
    slug: 'elgato-stream-deck-mk2',
    description: '15 tasti LCD personalizzabili per controllare stream, luci, audio e app. Integrazione con OBS, Twitch, YouTube, Spotify e centinaia di plugin. Lo strumento essenziale per ogni streamer.',
    image_url: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600',
    price_current: 129.99,
    price_original: 149.99,
    currency: 'EUR',

    category: 'Stream Deck',
    specs: { size: '15 tasti LCD', connectivity: 'USB-C', backlight: 'LCD personalizzabile' },
    meta_title: 'Elgato Stream Deck MK.2 - Controllo Totale del Tuo Stream',
    meta_description: 'Stream Deck MK.2: 15 tasti LCD per controllare OBS, Twitch, luci e audio. Lo strumento n.1 per streamer.',
  },
  // 9. Mousepad
  {
    title: 'Artisan FX Zero Soft XL',
    slug: 'artisan-fx-zero-soft-xl',
    description: 'Il mousepad giapponese preferito dai pro player. Superficie in tessuto artigianale con controllo e velocità bilanciati. Base in schiuma che si adatta alla scrivania. Made in Japan.',
    image_url: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=600',
    price_current: 59.99,
    price_original: null,
    currency: 'EUR',

    category: 'Mousepad',
    specs: { size: '490 x 420 x 4mm', weight_g: 200 },
    meta_title: 'Artisan FX Zero Soft XL - Il Mousepad dei Pro Player',
    meta_description: 'Artisan FX Zero: mousepad giapponese artigianale. Controllo perfetto per FPS competitivi. Made in Japan.',
  },
  // 10. Cattura Video
  {
    title: 'Elgato HD60 X - Scheda di Cattura',
    slug: 'elgato-hd60-x',
    description: 'Cattura video esterna per streaming e registrazione da console e PC. Supporta 4K30 e 1080p60 HDR passthrough. Compatibile con PS5, Xbox Series X, Nintendo Switch. Zero latenza in passthrough.',
    image_url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600',
    price_current: 159.99,
    price_original: 179.99,
    currency: 'EUR',

    category: 'Cattura Video',
    specs: { resolution: '4K30 / 1080p60 HDR', connectivity: 'USB-C 3.0', size: '112 x 72 x 18mm', weight_g: 115 },
    meta_title: 'Elgato HD60 X - Scheda di Cattura per Console e PC',
    meta_description: 'Elgato HD60 X: cattura 4K30, passthrough 4K60 HDR. Streaming perfetto da PS5, Xbox e Switch.',
  },
]

async function seed() {
  console.log('Seeding 10 prodotti hero...\n')

  // Pulisci tabella prodotti (per seed idempotente)
  const { error: deleteError } = await db.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteError) {
    console.error('Errore pulizia:', deleteError.message)
  }

  for (const product of products) {
    const { data, error } = await db.from('products').insert(product).select('id, title, slug').single()
    if (error) {
      console.error(`ERRORE: ${product.title}`, error.message)
    } else {
      console.log(`  OK: ${data.title} → /products/${data.slug}`)
    }
  }

  console.log('\nSeed completato!')
}

seed()
