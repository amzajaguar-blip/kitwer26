/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║     KERNEL SECURITY – IMPORT CATALOG SCRIPT v2.0               ║
 * ║  Legge CSV → genera data/products.ts + products-backup.json     ║
 * ║  Update automatico next.config.js con remotePatterns Amazon     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Uso: npm run import-catalog
 * oppure: tsx scripts/import-catalog.ts
 */

import csv from "csv-parser";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { z } from "zod";
import chalk from "chalk";
import cliProgress from "cli-progress";

// ─────────────────────────────────────────────
// CONFIGURAZIONE PATHS
// ─────────────────────────────────────────────

const CSV_PATH = path.resolve("./magazzino_pulito/catalogo_kernel_unificato.csv");
const OUTPUT_TS = path.resolve("./data/products.ts");
const OUTPUT_JSON = path.resolve("./data/products-backup.json");
const NEXT_CONFIG_PATH =
  fs.existsSync(path.resolve("./next.config.mjs"))
    ? path.resolve("./next.config.mjs")
    : path.resolve("./next.config.js");

// Domini Amazon validi per le immagini
const AMAZON_IMAGE_DOMAINS = [
  "m.media-amazon.com",
  "ssl-images-amazon.com",
  "images-na.ssl-images-amazon.com",
  "images-eu.ssl-images-amazon.com",
  "images-fe.ssl-images-amazon.com",
];

// ─────────────────────────────────────────────
// INTERFACCIA TYPESCRIPT OUTPUT
// ─────────────────────────────────────────────

export interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  amazonUrl: string;
  mainImage: string;
  images: string[];
  description: string;
  category: string;
  sku: string;
  tags: string[];
  vendor?: string;
  status: "CORE";
}

// ─────────────────────────────────────────────
// VALIDAZIONE ZOD
// ─────────────────────────────────────────────

const ProductSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(2),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  amazonUrl: z.string().url().startsWith("https://www.amazon.it/dp/"),
  mainImage: z.string().url(),
  images: z.array(z.string().url()).min(1),
  description: z.string(),
  category: z.string().min(1),
  sku: z.string(),
  tags: z.array(z.string()),
  vendor: z.string().optional(),
  status: z.literal("CORE"),
});

type ValidatedProduct = z.infer<typeof ProductSchema>;

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Estrae ASIN da qualsiasi URL Amazon e ritorna link pulito senza affiliate.
 */
function cleanAmazonUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  const asinPattern = /\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/;
  const match = url.match(asinPattern);

  if (match) {
    const asin = match[1] || match[2];
    return `https://www.amazon.it/dp/${asin}`;
  }

  // Tenta estrazione ASIN grezzo
  const rawAsin = url.match(/([A-Z0-9]{10})(?:[/?]|$)/);
  if (rawAsin && /^[A-Z0-9]{10}$/.test(rawAsin[1])) {
    return `https://www.amazon.it/dp/${rawAsin[1]}`;
  }

  return null;
}

/**
 * Valida e filtra URL immagini.
 * Accetta: Amazon CDN + Shopify CDN + HTTPS validi.
 * Rifiuta: placeholder, http non sicuro, URL malformati.
 */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return false;

  const placeholders = [
    "no-image", "missing", "placeholder", "default",
    "noimage", "blank", "no_image", "coming-soon", "n/a",
  ];
  const lower = trimmed.toLowerCase();
  if (placeholders.some((p) => lower.includes(p))) return false;

  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Raccoglie TUTTE le immagini da una riga CSV.
 * Cerca colonne: image_src, image2, image3... + colonna "images" con separatori.
 */
function collectImages(row: Record<string, string>): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  const addImage = (url: string) => {
    const trimmed = url.trim();
    if (isValidImageUrl(trimmed) && !seen.has(trimmed)) {
      seen.add(trimmed);
      images.push(trimmed);
    }
  };

  // Cerca tutte le colonne che iniziano con image/img/picture
  const imageColPattern = /^(image|img|picture)/i;
  for (const [key, val] of Object.entries(row)) {
    if (imageColPattern.test(key) && val) {
      addImage(val);
    }
  }

  // Colonna "images" con separatori multipli
  if (row["images"]) {
    const urls = row["images"].split(/[,|;]/);
    urls.forEach((url) => addImage(url));
  }

  // Colonna "all_images" (output dello script Python)
  if (row["all_images"]) {
    try {
      const parsed = JSON.parse(row["all_images"]);
      if (Array.isArray(parsed)) {
        parsed.forEach((url: string) => addImage(url));
      }
    } catch {
      // Non è JSON, prova come lista separata
      row["all_images"].split(/[,|;]/).forEach((url) => addImage(url));
    }
  }

  return images;
}

/**
 * Genera slug URL-safe da titolo o handle.
 */
function generateSlug(title: string, handle?: string): string {
  if (handle && handle.trim()) {
    return handle.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  }
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Normalizza prezzo: rimuove simboli valuta, gestisce virgola decimale.
 */
function parsePrice(val: string): number | null {
  if (!val || val.trim() === "" || val.toLowerCase() === "nan") return null;
  const cleaned = val
    .replace(/[€$£¥\s]/g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Genera ID univoco da slug + sku.
 */
function generateId(slug: string, sku: string, index: number): string {
  const base = sku && sku !== "nan" ? sku : `${slug}-${index}`;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

// ─────────────────────────────────────────────
// LETTORE CSV
// ─────────────────────────────────────────────

async function countCsvRows(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    let count = 0;
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", () => count++)
      .on("end", () => resolve(count))
      .on("error", () => resolve(0));
  });
}

async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    fs.createReadStream(filePath)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/\s+/g, "_") }))
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// ─────────────────────────────────────────────
// AGGIORNAMENTO NEXT.CONFIG
// ─────────────────────────────────────────────

const REMOTE_PATTERNS_BLOCK = `
  images: {
    remotePatterns: [
      // Amazon CDN – immagini prodotti
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-eu.ssl-images-amazon.com" },
      { protocol: "https", hostname: "images-fe.ssl-images-amazon.com" },
      // Shopify CDN (se usi immagini Shopify)
      { protocol: "https", hostname: "cdn.shopify.com" },
      // Imgbb (backup immagini)
      { protocol: "https", hostname: "i.ibb.co" },
    ],
  },`;

async function updateNextConfig(): Promise<void> {
  console.log(chalk.blue("\n🔧 Aggiornamento next.config..."));

  if (!fs.existsSync(NEXT_CONFIG_PATH)) {
    // Crea next.config.js di base
    const defaultConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
${REMOTE_PATTERNS_BLOCK}
};

module.exports = nextConfig;
`;
    await fsp.writeFile(NEXT_CONFIG_PATH, defaultConfig, "utf-8");
    console.log(chalk.green(`  ✅ Creato: ${path.basename(NEXT_CONFIG_PATH)}`));
    return;
  }

  let content = await fsp.readFile(NEXT_CONFIG_PATH, "utf-8");

  if (content.includes("remotePatterns")) {
    console.log(chalk.yellow("  ⚠️  remotePatterns già presente. Verifica manualmente se i domini Amazon sono inclusi."));
    return;
  }

  // Inserisci prima di module.exports o export default
  const insertBefore = content.includes("module.exports")
    ? "module.exports"
    : "export default";

  // Trova nextConfig = { e inserisci dentro
  content = content.replace(
    /const nextConfig\s*=\s*\{/,
    `const nextConfig = {${REMOTE_PATTERNS_BLOCK}`
  );

  await fsp.writeFile(NEXT_CONFIG_PATH, content, "utf-8");
  console.log(chalk.green(`  ✅ Aggiornato: ${path.basename(NEXT_CONFIG_PATH)} con remotePatterns Amazon`));
}

// ─────────────────────────────────────────────
// GENERATORE FILE TS
// ─────────────────────────────────────────────

function generateProductsTs(products: ValidatedProduct[]): string {
  const productEntries = products
    .map((p) => {
      const imagesStr = JSON.stringify(p.images, null, 6)
        .replace(/^\[/, "[\n      ")
        .replace(/\]$/, "\n    ]");
      const tagsStr = JSON.stringify(p.tags);

      return `  {
    id: ${JSON.stringify(p.id)},
    slug: ${JSON.stringify(p.slug)},
    title: ${JSON.stringify(p.title)},
    price: ${p.price},
    ${p.compareAtPrice ? `compareAtPrice: ${p.compareAtPrice},` : ""}
    amazonUrl: ${JSON.stringify(p.amazonUrl)},
    mainImage: ${JSON.stringify(p.mainImage)},
    images: ${imagesStr},
    description: ${JSON.stringify(p.description.slice(0, 2000))},
    category: ${JSON.stringify(p.category)},
    sku: ${JSON.stringify(p.sku)},
    tags: ${tagsStr},
    ${p.vendor ? `vendor: ${JSON.stringify(p.vendor)},` : ""}
    status: "CORE" as const,
  }`;
    })
    .join(",\n\n");

  return `/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  KERNEL SECURITY – PRODUCT CATALOG                         ║
 * ║  Auto-generato il: ${new Date().toISOString()}  ║
 * ║  Totale prodotti: ${products.length.toString().padEnd(5)}                              ║
 * ║  ⚠️  NON MODIFICARE MANUALMENTE – Usa: npm run import-catalog ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── INTERFACCIA PRODOTTO ────────────────────────────────────────
export interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  /** Link Amazon pulito: https://www.amazon.it/dp/{ASIN} – ZERO affiliate */
  amazonUrl: string;
  /** Prima immagine valida – usata come og:image e thumbnail */
  mainImage: string;
  /** Array completo di immagini per la galleria */
  images: string[];
  description: string;
  category: string;
  sku: string;
  tags: string[];
  vendor?: string;
  status: "CORE";
}

// ─── HELPER ─────────────────────────────────────────────────────

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) =>
    p.category.toLowerCase().includes(category.toLowerCase())
  );
}

export function getAllSlugs(): string[] {
  return products.map((p) => p.slug);
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );
}

// ─── CATALOGO ───────────────────────────────────────────────────
export const products: Product[] = [
${productEntries}
];
`;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log(chalk.cyan.bold(`
╔══════════════════════════════════════════════════════════╗
║     🛡️  KERNEL SECURITY – IMPORT CATALOG v2.0           ║
╚══════════════════════════════════════════════════════════╝
`));

  // Verifica esistenza CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(chalk.red(`\n❌ CSV non trovato: ${CSV_PATH}`));
    console.log(chalk.yellow("   Prima esegui: python clean_magazzino_kernel.py"));
    process.exit(1);
  }

  // Crea cartella data/ se non esiste
  await fsp.mkdir(path.dirname(OUTPUT_TS), { recursive: true });
  await fsp.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });

  console.log(chalk.blue(`📂 Lettura CSV: ${CSV_PATH}`));
  const totalRows = await countCsvRows(CSV_PATH);
  console.log(chalk.gray(`   Righe trovate: ${totalRows}\n`));

  // Progress bar
  const bar = new cliProgress.SingleBar({
    format: `${chalk.cyan("{bar}")} {percentage}% | {value}/{total} prodotti | ETA: {eta}s`,
    barCompleteChar: "█",
    barIncompleteChar: "░",
    hideCursor: true,
  });
  bar.start(totalRows, 0);

  const rows = await parseCsv(CSV_PATH);

  const products: ValidatedProduct[] = [];
  const errors: Array<{ index: number; title: string; error: string }> = [];
  let amazonLinksCleaned = 0;
  let totalImages = 0;
  let noAmazonUrl = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    bar.increment();

    try {
      // ── Raccoglie immagini ────────────────────────────────────
      const images = collectImages(row);
      if (images.length === 0) {
        errors.push({ index: i, title: row["title"] || "N/A", error: "Nessuna immagine valida" });
        continue;
      }
      const mainImage = images[0];
      totalImages += images.length;

      // ── URL Amazon pulito ─────────────────────────────────────
      const rawUrl = row["amazon_url_clean"] || row["amazon_url"] || row["product_url"] || row["url"] || "";
      const amazonUrl = cleanAmazonUrl(rawUrl);

      if (!amazonUrl) {
        noAmazonUrl++;
        errors.push({ index: i, title: row["title"] || "N/A", error: "URL Amazon non estraibile" });
        continue;
      }
      amazonLinksCleaned++;

      // ── Build product object ──────────────────────────────────
      const slug = generateSlug(row["title"] || "", row["handle"] || row["slug"] || "");
      const sku = row["sku"] || "";
      const price = parsePrice(row["price"] || "");
      const compareAtPrice = parsePrice(row["compare_at_price"] || "");
      const tags = (row["tags"] || "")
        .split(/[,;|]/)
        .map((t) => t.trim())
        .filter(Boolean);

      if (price === null) {
        errors.push({ index: i, title: row["title"] || "N/A", error: "Prezzo non valido" });
        continue;
      }

      const productRaw = {
        id: generateId(slug, sku, i),
        slug,
        title: (row["title"] || "").trim(),
        price,
        ...(compareAtPrice ? { compareAtPrice } : {}),
        amazonUrl,
        mainImage,
        images,
        description: (row["description"] || "").replace(/<[^>]*>/g, "").trim().slice(0, 2000),
        category: (row["category"] || "Uncategorized").trim(),
        sku,
        tags,
        ...(row["vendor"] ? { vendor: row["vendor"].trim() } : {}),
        status: "CORE" as const,
      };

      // ── Validazione Zod ───────────────────────────────────────
      const validated = ProductSchema.parse(productRaw);
      products.push(validated);
    } catch (err) {
      const errMsg = err instanceof z.ZodError
        ? err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")
        : String(err);
      errors.push({ index: i, title: row["title"] || "N/A", error: errMsg });
    }
  }

  bar.stop();

  // ── Salva output ──────────────────────────────────────────────

  // data/products.ts
  const tsContent = generateProductsTs(products);
  await fsp.writeFile(OUTPUT_TS, tsContent, "utf-8");

  // data/products-backup.json
  await fsp.writeFile(OUTPUT_JSON, JSON.stringify(products, null, 2), "utf-8");

  // Aggiorna next.config
  await updateNextConfig();

  // ── Report finale ─────────────────────────────────────────────
  console.log(chalk.green.bold(`
╔══════════════════════════════════════════════════════════╗
║  ✅ IMPORT COMPLETATO                                    ║
╠══════════════════════════════════════════════════════════╣`));
  console.log(chalk.green(`║  📦 Prodotti importati:    ${String(products.length).padEnd(28)}║`));
  console.log(chalk.green(`║  🔗 Link Amazon puliti:    ${String(amazonLinksCleaned).padEnd(28)}║`));
  console.log(chalk.green(`║  📸 Immagini totali:       ${String(totalImages).padEnd(28)}║`));
  console.log(chalk.yellow(`║  ⚠️  Errori/skip:           ${String(errors.length).padEnd(28)}║`));
  console.log(chalk.yellow(`║  ⚠️  Senza URL Amazon:      ${String(noAmazonUrl).padEnd(28)}║`));
  console.log(chalk.green(`╚══════════════════════════════════════════════════════════╝`));

  console.log(chalk.blue(`\n📄 Output generati:`));
  console.log(`   ${chalk.cyan(OUTPUT_TS)}`);
  console.log(`   ${chalk.cyan(OUTPUT_JSON)}`);

  if (errors.length > 0) {
    console.log(chalk.yellow(`\n⚠️  PRODOTTI SALTATI (${errors.length}):`));
    errors.slice(0, 10).forEach((e) => {
      console.log(chalk.gray(`   [${e.index}] "${e.title.slice(0, 40)}" → ${e.error}`));
    });
    if (errors.length > 10) {
      console.log(chalk.gray(`   ... e altri ${errors.length - 10} errori`));
    }
  }

  console.log(chalk.green.bold(`\n🚀 Ora puoi usare: import { products } from "@/data/products"\n`));
}

main().catch((err) => {
  console.error(chalk.red("\n❌ Errore fatale:"), err);
  process.exit(1);
});
