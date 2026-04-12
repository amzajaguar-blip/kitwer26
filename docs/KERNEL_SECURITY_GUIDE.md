# ╔══════════════════════════════════════════════════════════════════╗
# ║     KERNEL SECURITY – GUIDA COMPLETA INSTALLAZIONE ED USO      ║
# ║     Versione: 2.0 | Data: 2026                                 ║
# ╚══════════════════════════════════════════════════════════════════╝

---

## 📁 STRUTTURA FILE GENERATI

```
kernel-security/
├── scripts/
│   └── import-catalog.ts          ← Script import CSV → TypeScript
├── app/
│   ├── page.tsx                   ← Homepage completa
│   ├── globals.css                ← Stili + variabili + animazioni
│   └── components/
│       └── ProductGallery.tsx     ← Galleria immagini con lightbox
├── components/
│   ├── KernelHeader.tsx           ← Nav con dropdown
│   └── KernelHero.tsx             ← Hero section
├── data/
│   ├── products.ts                ← (auto-generato) catalogo TypeScript
│   └── products-backup.json       ← (auto-generato) backup JSON
├── magazzino/                     ← Metti qui i tuoi CSV originali
├── magazzino_pulito/              ← Output script Python
│   ├── *_cleaned.csv
│   ├── *_eliminati.csv
│   ├── catalogo_kernel_unificato.csv  ← Input per import-catalog.ts
│   └── REPORT_PULIZIA_KERNEL.md
└── clean_magazzino_kernel.py      ← Script pulizia Python
```

---

## 🐍 FASE 1 – PULIZIA CSV CON PYTHON

### Installazione dipendenze Python

```bash
pip install pandas rapidfuzz tqdm pathlib
```

### Preparazione
1. Crea la cartella `magazzino/` nella root del progetto
2. Copia tutti i tuoi file CSV dentro `magazzino/`
3. Salva `clean_magazzino_kernel.py` nella root

### Esecuzione

```bash
# Standard (threshold fuzzy 88%)
python clean_magazzino_kernel.py

# Con parametri personalizzati
python clean_magazzino_kernel.py \
  --input_dir magazzino \
  --output_dir magazzino_pulito \
  --fuzzy_threshold 90
```

### Output atteso
- `magazzino_pulito/nomefile_cleaned.csv` per ogni CSV
- `magazzino_pulito/nomefile_eliminati.csv` con righe scartate
- `magazzino_pulito/catalogo_kernel_unificato.csv` ← **FILE MASTER**
- `magazzino_pulito/REPORT_PULIZIA_KERNEL.md` con statistiche

---

## ⚙️ FASE 2 – CONFIGURAZIONE NEXT.JS

### 1. next.config.js (sostituisci il tuo)

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // ── Amazon CDN ─────────────────────────────────────────
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-fe.ssl-images-amazon.com" },
      // ── Shopify CDN (opzionale) ─────────────────────────────
      { protocol: "https", hostname: "cdn.shopify.com" },
      // ── Backup immagini ─────────────────────────────────────
      { protocol: "https", hostname: "i.ibb.co" },
    ],
  },
  // Altre configurazioni esistenti...
};

module.exports = nextConfig;
```

### 2. tailwind.config.js – Aggiungi colori custom

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: "#00FF9D",
        surface: "#0A0A0A",
        "surface-raised": "#0F0F0F",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Courier New", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        ticker: "ticker 30s linear infinite",
        "neon-pulse": "neon-pulse 2.5s ease-in-out infinite",
        blink: "blink 0.8s step-end infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in-down": "fade-in-down 0.5s ease-out forwards",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "neon-pulse": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(0,255,157,0.4), 0 0 20px rgba(0,255,157,0.2)" },
          "50%": { boxShadow: "0 0 20px rgba(0,255,157,0.7), 0 0 40px rgba(0,255,157,0.35)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
```

---

## 📦 FASE 3 – PACKAGE.JSON

### Aggiungi queste sezioni al tuo package.json:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "import-catalog": "tsx scripts/import-catalog.ts",
    "clean-catalog": "python clean_magazzino_kernel.py",
    "full-pipeline": "npm run clean-catalog && npm run import-catalog"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "cli-progress": "^3.12.0",
    "csv-parser": "^3.0.0",
    "zod": "^3.22.0"
  }
}
```

### Installa le dipendenze:

```bash
npm install chalk cli-progress csv-parser zod
npm install -D tsx @types/node
```

---

## 🚀 FASE 4 – ESEGUIRE L'IMPORT

```bash
# Esegui la pipeline completa (Python + TypeScript)
npm run full-pipeline

# Oppure solo il TypeScript import (se il CSV è già pronto)
npm run import-catalog
```

### Output:
- `data/products.ts` – array tipizzato con tutti i prodotti
- `data/products-backup.json` – backup JSON
- `next.config.js` aggiornato automaticamente con i remotePatterns

---

## 💻 FASE 5 – USARE IL CATALOGO IN UNA PAGINA

### Esempio: Pagina prodotto con galleria

```tsx
// app/prodotto/[slug]/page.tsx
import { getProductBySlug, getAllSlugs } from "@/data/products";
import ProductGallery from "@/app/components/ProductGallery";
import { notFound } from "next/navigation";
import { Shield } from "lucide-react";

// Genera rotte statiche per tutti i prodotti
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">

      {/* Galleria immagini */}
      <ProductGallery
        images={product.images}
        mainImage={product.mainImage}
        title={product.title}
      />

      {/* Info prodotto */}
      <div className="flex flex-col">
        <div className="text-[11px] font-mono text-neon/60 uppercase tracking-widest mb-2">
          {product.category}
        </div>
        <h1 className="text-3xl font-black text-white mb-4">{product.title}</h1>

        <div className="flex items-baseline gap-3 mb-6">
          <span className="text-3xl font-black text-white">€{product.price}</span>
          {product.compareAtPrice && (
            <span className="text-lg text-zinc-600 line-through">€{product.compareAtPrice}</span>
          )}
        </div>

        <p className="text-zinc-400 text-[14px] leading-relaxed mb-8">
          {product.description}
        </p>

        {/* CTA Amazon (link pulito, zero affiliate) */}
        <a
          href={product.amazonUrl}   // ← sempre https://www.amazon.it/dp/{ASIN}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 py-4 rounded-xl
                     bg-neon text-black font-black text-[15px] uppercase tracking-wide
                     hover:bg-neon/90 transition-all shadow-[0_0_30px_rgba(0,255,157,0.4)]"
        >
          <Shield className="w-5 h-5" />
          Acquista su Amazon
        </a>

        <p className="mt-3 text-center text-[11px] font-mono text-zinc-600">
          Link diretto Amazon.it • Zero commissioni • Zero tracking
        </p>
      </div>
    </div>
  );
}
```

### Esempio: Lista prodotti filtrata per categoria

```tsx
import { getProductsByCategory } from "@/data/products";

export default function CryptoPage() {
  const products = getProductsByCategory("crypto");
  // oppure: getProductsByCategory("bundle")
  // oppure: getProductsByCategory("survival")

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((p) => (
        <div key={p.id}>
          <h3>{p.title}</h3>
          <p>€{p.price}</p>
          {/* Usa p.images[] per la galleria, p.mainImage per thumbnail */}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔍 COLONNE CSV SUPPORTATE

Lo script riconosce automaticamente queste colonne (case-insensitive):

| Colonna CSV | Campo Product | Note |
|-------------|---------------|------|
| `title` | `title` | Obbligatorio |
| `handle` / `slug` | `slug` | Auto-generato se assente |
| `price` | `price` | Supporta €, $, virgole |
| `compare_at_price` | `compareAtPrice` | Opzionale |
| `sku` | `sku` | Usato per dedup |
| `description` / `body_html` | `description` | Strip HTML auto |
| `category` / `type` | `category` | |
| `tags` | `tags[]` | Split per `,;|` |
| `vendor` | `vendor` | Opzionale |
| `amazon_url` / `product_url` / `url` | `amazonUrl` | ASIN estratto auto |
| `image_src` | `images[0]` | Prima immagine |
| `image2`, `image3`... | `images[]` | Raccolte tutte |
| `images` | `images[]` | Split per `,|;` |
| `all_images` (output Python) | `images[]` | JSON array o separato |

---

## ✅ CHECKLIST PRIMA DEL DEPLOY

- [ ] `npm run full-pipeline` completato senza errori critici
- [ ] `data/products.ts` generato con prodotti > 0
- [ ] `next.config.js` ha tutti i remotePatterns Amazon
- [ ] `tailwind.config.js` ha colori `neon` e `surface`
- [ ] `app/globals.css` importato in `app/layout.tsx`
- [ ] `KernelHeader` e `KernelHero` importati in `app/page.tsx`
- [ ] Testato su mobile (menu hamburger funzionante)
- [ ] Verificato che ZERO link contengano parametri affiliate/tracking

---

## ⚠️ NOTE IMPORTANTI

**Zero affiliate:** ogni link Amazon è nel formato esatto `https://www.amazon.it/dp/{ASIN}`.
Nessun tag, nessun `ref=`, nessun parametro di tracking viene mai aggiunto.

**Immagini:** next/image richiede i domini in `remotePatterns`. Lo script aggiorna
`next.config.js` automaticamente, ma verifica che la modifica sia corretta prima del build.

**CSV malformati:** righe con errori vengono saltate e loggati nel report finale.
Il processo continua sempre, non si blocca su file corrotti.
