/**
 * Setup Database - Crea le tabelle via Supabase REST API
 * Usa le singole operazioni per creare tabelle quando psql non è disponibile
 *
 * Esegui con: npx tsx scripts/setup-db.ts
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const db = createClient(url, key, {
  db: { schema: 'public' }
})

async function testConnection() {
  // Prova a fare una select su products per vedere se la tabella esiste
  const { error } = await db.from('products').select('id').limit(1)
  if (error && error.message.includes('does not exist')) {
    return false
  }
  return true
}

async function testAndSeed() {
  console.log('Verifico connessione a Supabase...')
  console.log(`URL: ${url}`)

  const tablesExist = await testConnection()

  if (!tablesExist) {
    console.log('\n⚠️  Le tabelle NON esistono ancora.')
    console.log('Devi eseguire lo schema SQL manualmente:')
    console.log('')
    console.log('1. Vai su: https://supabase.com/dashboard/project/layehkivpxlscamgfive/sql/new')
    console.log('2. Copia il contenuto di supabase/schema.sql')
    console.log('3. Incolla nell\'editor SQL e clicca "Run"')
    console.log('')
    console.log('Dopo aver creato le tabelle, esegui:')
    console.log('  npx tsx scripts/seed-gaming.ts')
    process.exit(1)
  }

  console.log('✓ Tabelle trovate! Connessione OK.')
  console.log('\nProcedo con il seed dei 10 prodotti...\n')

  // Seed inline
  const products = [
    {
      title: 'LG UltraGear 27GP850-B 27" QHD 165Hz',
      slug: 'lg-ultragear-27gp850-b',
      description: 'Monitor gaming Nano IPS da 27 pollici con risoluzione QHD (2560x1440), 165Hz, 1ms GtG, HDR400, compatibile G-Sync e FreeSync Premium. Il pannello Nano IPS offre colori vividi con copertura DCI-P3 del 98%.',
      image_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600',
      price_current: 349.99, price_original: 449.99, currency: 'EUR',
      category: 'Monitor 144hz',
      specs: { panel_type: 'Nano IPS', resolution: '2560x1440', refresh_rate: '165Hz', response_time: '1ms GtG', size: '27"', connectivity: 'HDMI 2.0 x2, DP 1.4', backlight: 'HDR400' },
      meta_title: 'LG UltraGear 27GP850 - Miglior Monitor Gaming QHD', meta_description: 'Monitor gaming LG UltraGear 27" QHD 165Hz Nano IPS.',
    },
    {
      title: 'Logitech G Pro X Superlight 2',
      slug: 'logitech-g-pro-x-superlight-2',
      description: 'Il mouse wireless più leggero di Logitech per il gaming competitivo. Sensore HERO 2 da 44K DPI, 95 ore di batteria, solo 60g di peso.',
      image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=600',
      price_current: 139.99, price_original: 169.99, currency: 'EUR',
      category: 'Mouse',
      specs: { dpi: 44000, polling_rate: '2000Hz', weight_g: 60, connectivity: 'Wireless LIGHTSPEED', battery_life: '95 ore', switch_type: 'LIGHTFORCE Hybrid' },
      meta_title: 'Logitech G Pro X Superlight 2 - Mouse Pro Gaming', meta_description: 'Solo 60g, sensore HERO 2 44K DPI, 95h batteria.',
    },
    {
      title: 'Keychron Q1 Pro - Custom Mechanical',
      slug: 'keychron-q1-pro',
      description: 'Tastiera meccanica custom 75% in alluminio CNC. Hot-swappable, QMK/VIA programmabile, Gasket Mount. Bluetooth 5.1 e USB-C.',
      image_url: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=600',
      price_current: 189.00, price_original: 219.00, currency: 'EUR',
      category: 'Tastiera',
      specs: { layout: '75%', switch_type: 'Gateron Jupiter Banana', hot_swappable: true, connectivity: 'Bluetooth 5.1 + USB-C', keycaps: 'Double-shot PBT', backlight: 'RGB South-facing' },
      meta_title: 'Keychron Q1 Pro - Tastiera Meccanica Custom', meta_description: 'Tastiera meccanica 75% in alluminio, hot-swap, QMK/VIA.',
    },
    {
      title: 'Shure SM7B - Microfono Dinamico',
      slug: 'shure-sm7b',
      description: 'Lo standard industriale per streaming e podcast. Microfono dinamico cardioide con eccellente rejection del rumore ambientale.',
      image_url: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600',
      price_current: 359.00, price_original: 399.00, currency: 'EUR',
      category: 'Microfono',
      specs: { polar_pattern: 'Cardioide', frequency_response: '50Hz - 20kHz', connectivity: 'XLR', weight_g: 766 },
      meta_title: 'Shure SM7B - Microfono Streamer Pro', meta_description: 'Il microfono dinamico più usato da streamer professionisti.',
    },
    {
      title: 'NVIDIA GeForce RTX 4070 Super',
      slug: 'nvidia-rtx-4070-super',
      description: 'La GPU sweet-spot per il gaming 1440p. Ada Lovelace, 12GB GDDR6X, DLSS 3.5 con Frame Generation.',
      image_url: 'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=600',
      price_current: 599.99, price_original: 649.99, currency: 'EUR',
      category: 'GPU',
      specs: { vram: '12GB GDDR6X', cuda_cores: 7168, boost_clock: '2475 MHz', tdp: '220W', connectivity: 'HDMI 2.1, DP 1.4a x3' },
      meta_title: 'RTX 4070 Super - Migliore GPU Gaming 1440p', meta_description: '12GB GDDR6X, DLSS 3.5, Ray Tracing.',
    },
    {
      title: 'SteelSeries Arctis Nova Pro Wireless',
      slug: 'steelseries-arctis-nova-pro-wireless',
      description: 'Cuffie wireless premium. Audio hi-fi con driver planari, ANC attivo, doppia batteria hot-swap.',
      image_url: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=600',
      price_current: 299.99, price_original: 379.99, currency: 'EUR',
      category: 'Cuffie',
      specs: { connectivity: '2.4GHz + Bluetooth', weight_g: 338, battery_life: '22h + hot-swap', frequency_response: '10Hz - 40kHz' },
      meta_title: 'Arctis Nova Pro Wireless - Cuffie Gaming Premium', meta_description: 'ANC, dual battery, audio hi-fi.',
    },
    {
      title: 'Elgato Facecam Pro 4K60',
      slug: 'elgato-facecam-pro-4k60',
      description: 'Prima webcam al mondo con 4K a 60fps. Sensore Sony STARVIS 2, f/1.7, autofocus velocissimo.',
      image_url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600',
      price_current: 249.99, price_original: 299.99, currency: 'EUR',
      category: 'Webcam',
      specs: { resolution: '4K 60fps', connectivity: 'USB-C', size: '81 x 48mm' },
      meta_title: 'Elgato Facecam Pro - Webcam 4K60 Streamer', meta_description: 'Prima webcam 4K 60fps. Sensore Sony, f/1.7.',
    },
    {
      title: 'Elgato Stream Deck MK.2',
      slug: 'elgato-stream-deck-mk2',
      description: '15 tasti LCD personalizzabili per controllare stream, luci, audio e app. Integrazione con OBS, Twitch, YouTube.',
      image_url: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600',
      price_current: 129.99, price_original: 149.99, currency: 'EUR',
      category: 'Stream Deck',
      specs: { size: '15 tasti LCD', connectivity: 'USB-C', backlight: 'LCD personalizzabile' },
      meta_title: 'Elgato Stream Deck MK.2 - Controllo Stream', meta_description: '15 tasti LCD per OBS, Twitch, luci e audio.',
    },
    {
      title: 'Artisan FX Zero Soft XL',
      slug: 'artisan-fx-zero-soft-xl',
      description: 'Mousepad giapponese dei pro player. Superficie in tessuto artigianale, controllo e velocità bilanciati. Made in Japan.',
      image_url: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=600',
      price_current: 59.99, price_original: null, currency: 'EUR',
      category: 'Mousepad',
      specs: { size: '490 x 420 x 4mm', weight_g: 200 },
      meta_title: 'Artisan FX Zero Soft XL - Mousepad Pro', meta_description: 'Mousepad giapponese artigianale per FPS competitivi.',
    },
    {
      title: 'Elgato HD60 X - Scheda di Cattura',
      slug: 'elgato-hd60-x',
      description: 'Cattura video esterna. 4K30, 1080p60 HDR passthrough. PS5, Xbox Series X, Switch. Zero latenza.',
      image_url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600',
      price_current: 159.99, price_original: 179.99, currency: 'EUR',
      category: 'Cattura Video',
      specs: { resolution: '4K30 / 1080p60 HDR', connectivity: 'USB-C 3.0', size: '112 x 72 x 18mm', weight_g: 115 },
      meta_title: 'Elgato HD60 X - Cattura Video Console/PC', meta_description: 'Cattura 4K30, passthrough 4K60 HDR.',
    },
  ]

  // Pulisci e inserisci
  console.log('Pulizia tabella prodotti...')
  await db.from('product_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  for (const product of products) {
    const { data, error } = await db.from('products').insert(product).select('id, title, slug').single()
    if (error) {
      console.error(`  ✗ ${product.title}: ${error.message}`)
    } else {
      console.log(`  ✓ ${data.title} → /products/${data.slug}`)
    }
  }

  console.log('\nSeed completato!')
}

testAndSeed()
