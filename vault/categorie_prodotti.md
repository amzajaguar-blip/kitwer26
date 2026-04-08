# KITWER26 — CATALOGO CATEGORIE & REGOLE PRODOTTO
> File Vault ufficiale. Copia in workspace/kitwer26/vault/ prima di avviare lo sciame.

---

## STRUTTURA CATEGORIE

### Categoria: Elettronica
- **Sotto-categorie:** Smartphone, Laptop, Wearables, Tablet, Accessori Tech
- **ID formato:** `JAG-ELETT-XXXX`
- **Campi obbligatori:** nome, brand, modello, prezzo, immagine, descrizione_breve, specifiche_tecniche
- **Immagini:** `/public/assets/products/elettronica/`

### Categoria: Abbigliamento
- **Sotto-categorie:** Uomo, Donna, Bambino, Accessori, Sportivo
- **ID formato:** `JAG-ABBIGL-XXXX`
- **Campi obbligatori:** nome, taglia (XS/S/M/L/XL/XXL), colore, materiale, prezzo, immagine
- **Immagini:** `/public/assets/products/abbigliamento/`

### Categoria: Casa & Arredo
- **Sotto-categorie:** Cucina, Camera, Bagno, Giardino, Decorazioni
- **ID formato:** `JAG-CASA-XXXX`
- **Campi obbligatori:** nome, dimensioni, materiale, colore, prezzo, immagine
- **Immagini:** `/public/assets/products/casa/`

### Categoria: Sport & Outdoor
- **Sotto-categorie:** Fitness, Ciclismo, Corsa, Nuoto, Montagna
- **ID formato:** `JAG-SPORT-XXXX`
- **Campi obbligatori:** nome, sport_tipo, taglia_o_misura, peso, prezzo, immagine
- **Immagini:** `/public/assets/products/sport/`

### Categoria: Bellezza & Cura
- **Sotto-categorie:** Skincare, Makeup, Capelli, Profumi, Uomo
- **ID formato:** `JAG-BEAUTY-XXXX`
- **Campi obbligatori:** nome, brand, volume_o_peso, ingredienti_chiave, prezzo, immagine
- **Immagini:** `/public/assets/products/beauty/`

---

## REGOLE GENERALI CARICAMENTO

1. **ID univoco:** formato `JAG-[CATEGORIA]-XXXX` dove XXXX = numero a 4 cifre progressivo (es. `JAG-ELETT-0001`)
2. **Immagini:** salvare in `/public/assets/products/[categoria]/[id].webp`
3. **Prezzo:** sempre in EUR con 2 decimali (es. `29.99`)
4. **Slug URL:** generato automaticamente dal nome in kebab-case (es. `smartphone-x-pro` → `/prodotti/smartphone-x-pro`)
5. **Stock:** campo `disponibile: true/false` + `quantita_magazzino: number`
6. **SEO:** ogni prodotto deve avere `meta_title` (max 60 char) e `meta_description` (max 160 char)

---

## SCHEMA DATABASE (Supabase)

```sql
-- Tabella prodotti
CREATE TABLE prodotti (
  id          TEXT PRIMARY KEY,           -- JAG-ELETT-0001
  nome        TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  sotto_cat   TEXT NOT NULL,
  prezzo      DECIMAL(10,2) NOT NULL,
  immagine    TEXT,                        -- path relativo
  descrizione TEXT,
  disponibile BOOLEAN DEFAULT true,
  stock       INTEGER DEFAULT 0,
  slug        TEXT UNIQUE,
  meta_title  TEXT,
  meta_desc   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## REGOLE PER LO SCIAME

- **Prima di creare un prodotto:** cerca nel vault se esiste già un ID simile per evitare duplicati
- **Categoria sempre in italiano** nella UI, in inglese negli slug URL
- **Immagini placeholder:** se non disponibile, usare `/public/assets/products/placeholder.webp`
- **Validazione prezzi:** rifiutare prodotti con prezzo ≤ 0 o > 99999
- **Tag automatici:** ogni prodotto genera tag da categoria + sotto-categoria + brand

---

## ESEMPIO PRODOTTO COMPLETO

```json
{
  "id": "JAG-ELETT-0001",
  "nome": "Smartphone X Pro",
  "categoria": "Elettronica",
  "sotto_cat": "Smartphone",
  "prezzo": 599.99,
  "immagine": "/public/assets/products/elettronica/JAG-ELETT-0001.webp",
  "descrizione": "Smartphone di ultima generazione con display AMOLED 6.7\"",
  "disponibile": true,
  "stock": 50,
  "slug": "smartphone-x-pro",
  "meta_title": "Smartphone X Pro — Elettronica | Kitwer26",
  "meta_desc": "Acquista Smartphone X Pro: display AMOLED, 128GB, garanzia 2 anni."
}
```

---

*Vault Kitwer26 — aggiornato 2026-03-26*
