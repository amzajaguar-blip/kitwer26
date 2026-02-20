# Kitwer26 - Tech Hardware E-commerce

E-commerce moderno e mobile-first per hardware, kit e firmware tech.

## 🎨 Design

- **Palette**: White (#FFFFFF), Black (#1A1A1A), Green (#2ecc71)
- **Mobile-First**: Ottimizzato per "Sara" con UI thumb-friendly
- **Responsive**: Hamburger menu fluido e pulsanti touch-optimized

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **TypeScript**: Type-safe development

## 📦 Categorie Prodotti

1. **Kit & Firmware** - Kit di recovery, firmware e tool di sviluppo
2. **PC Gaming & Monitor** - Hardware gaming e periferiche
3. **Sistemi All-in-One** - PC completi e soluzioni integrate

## 🚀 Getting Started

```bash
# Installa dipendenze
npm install

# Avvia server di sviluppo
npm run dev

# Build per produzione
npm run build

# Start produzione
npm start
```

Apri [http://localhost:3000](http://localhost:3000) per vedere il risultato.

## 📂 Struttura Progetto

```
kitwer26/
├── app/
│   ├── components/
│   │   ├── Navbar.tsx         # Navigation con hamburger menu
│   │   ├── ProductCard.tsx    # Card prodotto
│   │   └── AdMobBanner.tsx    # Slot pubblicitario
│   ├── globals.css            # Stili globali + Tailwind
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Homepage
├── data/
│   └── inventory.json         # Database prodotti
├── lib/
│   └── sync.ts                # Sync API (AliExpress, CJdropshipping)
└── public/                    # Assets statici
```

## 🔄 Sync Inventory

Il file `lib/sync.ts` gestisce la sincronizzazione con fornitori esterni:

```typescript
import { syncAllSuppliers, getLocalInventory } from '@/lib/sync';

// Sincronizza tutti i fornitori
await syncAllSuppliers();

// Leggi inventory locale
const inventory = await getLocalInventory();
```

### Future API Integration

- **AliExpress API**: Sync automatico prezzi e stock
- **CJdropshipping API**: Gestione dropshipping

## 📱 AdMob Integration

Lo slot AdMob è posizionato sopra la sezione "Top Sellers". Inserisci il tuo codice AdMob in `app/components/AdMobBanner.tsx`.

## 📄 License

ISC
