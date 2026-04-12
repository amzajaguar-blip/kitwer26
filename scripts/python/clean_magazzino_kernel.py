#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║         KERNEL SECURITY – CATALOG CLEANER v2.0                  ║
║  Senior Data Engineer Pipeline: 7 fasi di pulizia automatica    ║
║  Output: catalogo CORE pronto per import Next.js                ║
╚══════════════════════════════════════════════════════════════════╝

Utilizzo:
    python clean_magazzino_kernel.py --input_dir magazzino --output_dir magazzino_pulito --fuzzy_threshold 88

Requisiti:
    pip install pandas rapidfuzz tqdm pathlib
"""

import argparse
import logging
import re
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
from rapidfuzz import fuzz
from tqdm import tqdm

# ─────────────────────────────────────────────
# CONFIGURAZIONE LOGGING
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("kernel_cleaner.log", encoding="utf-8"),
    ],
)
log = logging.getLogger("KernelCleaner")

# ─────────────────────────────────────────────
# KEYWORD CONFIG KERNEL SECURITY
# ─────────────────────────────────────────────

KEYWORD_CORE = [
    "trezor", "wallet", "cold storage", "encryption", "bundle tattico",
    "secure", "crypto", "hardware wallet", "kernel", "air-gapped", "airgapped",
    "faraday", "privacy screen", "survival edc", "defcon", "aes-256", "aes256",
    "ngrave", "cypherock", "ledger", "bitbox", "coldcard", "passphrase",
    "data blocker", "rfid", "signal blocker", "emp shield", "tactical",
    "opsec", "zero trust", "vpn hardware", "yubikey", "fido2", "hsm",
    "security key", "privacy filter", "screen protector privacy", "faraday bag",
    "faraday pouch", "signal shield", "edc kit", "survival kit", "multitool",
    "paracord", "emergency kit", "first aid tactical", "ballistic", "molle",
]

KEYWORD_ELIMINA = [
    "gaming mouse", "tastiera meccanica", "sim racing", "gaming desk",
    "3d printing", "smart home", "microfono streaming", "monitor 144hz",
    "gpu consumer", "rgb gaming", "gaming chair", "steering wheel",
    "racing wheel", "filament", "alexa", "google home", "smart speaker",
    "ring doorbell", "smart bulb", "smart plug", "streaming mic",
    "capture card", "gaming headset", "mousepads rgb", "gaming monitor",
    "webcam streaming", "elgato", "razer gaming", "corsair gaming",
]

PLACEHOLDER_IMAGES = [
    "no-image", "missing", "placeholder", "default", "noimage",
    "blank", "no_image", "na.jpg", "n/a", "coming-soon",
]

VALID_IMAGE_DOMAINS = [
    "m.media-amazon.com",
    "ssl-images-amazon.com",
    "images-na.ssl-images-amazon.com",
    "images-eu.ssl-images-amazon.com",
    "images-fe.ssl-images-amazon.com",
    "amazon.it",
    "amazon.com",
    "i.ibb.co",
    "cdn.shopify.com",
]


# ─────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────

def strip_html(text: str) -> str:
    """Rimuove tag HTML da una stringa."""
    if not isinstance(text, str):
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean


def clean_price(val) -> float | None:
    """Normalizza il prezzo: rimuove simboli valuta, virgole, converti in float."""
    if pd.isna(val) or val == "" or val is None:
        return None
    val_str = str(val).strip()
    val_str = re.sub(r"[€$£¥\s]", "", val_str)
    val_str = val_str.replace(",", ".")
    # rimuovi punti migliaia se ci sono decimali (es 1.234,56 → 1234.56)
    if val_str.count(".") > 1:
        parts = val_str.rsplit(".", 1)
        val_str = parts[0].replace(".", "") + "." + parts[1]
    try:
        return float(val_str)
    except ValueError:
        return None


def is_valid_image_url(url: str) -> bool:
    """Verifica che l'URL sia un'immagine valida (non placeholder)."""
    if not isinstance(url, str) or not url.strip():
        return False
    url_lower = url.lower().strip()
    if not url_lower.startswith("http"):
        return False
    for ph in PLACEHOLDER_IMAGES:
        if ph in url_lower:
            return False
    return True


def extract_amazon_asin(url: str) -> str | None:
    """Estrae l'ASIN da un URL Amazon e restituisce link pulito."""
    if not isinstance(url, str):
        return None
    # Pattern: /dp/ASIN o /gp/product/ASIN
    patterns = [
        r"/dp/([A-Z0-9]{10})",
        r"/gp/product/([A-Z0-9]{10})",
        r"amazon\.[a-z.]+/[^/]*/([A-Z0-9]{10})",
        r"([A-Z0-9]{10})(?:[/?]|$)",
    ]
    for pat in patterns:
        match = re.search(pat, url)
        if match:
            asin = match.group(1)
            if len(asin) == 10 and asin.isalnum():
                return f"https://www.amazon.it/dp/{asin}"
    return None


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalizza i nomi delle colonne (lowercase, strip, underscore)."""
    df.columns = [
        c.strip().lower().replace(" ", "_").replace("-", "_")
        for c in df.columns
    ]
    return df


def classify_product(row: pd.Series) -> tuple[str, str]:
    """
    Classifica un prodotto come CORE o ELIMINA.
    Ritorna (status, motivazione).
    """
    text_fields = " ".join([
        str(row.get("title", "")),
        str(row.get("tags", "")),
        str(row.get("category", "")),
        str(row.get("description", "")),
    ]).lower()

    # Check ELIMINA prima (esclusione dura)
    for kw in KEYWORD_ELIMINA:
        if kw in text_fields:
            return "ELIMINA", f"keyword_elimina: '{kw}'"

    # Check CORE
    for kw in KEYWORD_CORE:
        if kw in text_fields:
            return "CORE", ""

    # Default: prodotto non classificato → ELIMINA (Kernel Security è esclusivo)
    return "ELIMINA", "nessuna_keyword_core_trovata"


def generate_tags(title: str) -> str:
    """Genera tag automatici dal titolo se vuoti."""
    if not isinstance(title, str):
        return ""
    words = re.findall(r"\b[a-zA-Z]{4,}\b", title)
    return ", ".join(set(w.lower() for w in words[:8]))


def is_prezzo_folle(price: float | None, compare_at: float | None, category: str) -> tuple[bool, str]:
    """Rileva prezzi anomali."""
    if price is None or pd.isna(price):
        return True, "prezzo_nullo_o_nan"
    if price == 0:
        return True, "prezzo_zero"
    if price < 5:
        return True, f"prezzo_troppo_basso: {price}€"

    # Categorie premium ammesse sopra 2000€
    premium_cats = ["bundle tattico", "crypto", "hardware wallet", "trezor", "ngrave", "cold storage"]
    cat_lower = str(category).lower()
    is_premium = any(p in cat_lower for p in premium_cats)

    if price > 2000 and not is_premium:
        return True, f"prezzo_troppo_alto_senza_categoria_premium: {price}€"
    if compare_at and not pd.isna(compare_at) and compare_at > 0:
        ratio = compare_at / price
        if ratio > 4.0:
            return True, f"markup_esagerato: {ratio:.1f}x"
    return False, ""


# ─────────────────────────────────────────────
# FASE 2: DEDUPLICAZIONE FUZZY
# ─────────────────────────────────────────────

def deduplicate(df: pd.DataFrame, fuzzy_threshold: int = 88) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Deduplicazione in 2 step:
    1. Exact match su SKU
    2. Fuzzy match su title (token_sort_ratio)
    Tieni il record con più immagini e prezzo più ragionevole.
    """
    eliminati_dedup = []

    # Step 1: Exact SKU dedup
    if "sku" in df.columns:
        df_no_empty_sku = df[df["sku"].notna() & (df["sku"] != "")]
        df_empty_sku = df[df["sku"].isna() | (df["sku"] == "")]

        def best_row_by_sku(group):
            # Preferisci riga con immagine
            has_img = group[group["image_src"].notna() & (group["image_src"] != "")]
            candidates = has_img if not has_img.empty else group
            return candidates.iloc[0]

        deduped_sku = df_no_empty_sku.groupby("sku", group_keys=False).apply(best_row_by_sku)
        eliminated_sku_count = len(df_no_empty_sku) - len(deduped_sku)
        log.info(f"  [Dedup SKU] Rimossi {eliminated_sku_count} duplicati esatti.")
        df = pd.concat([deduped_sku, df_empty_sku], ignore_index=True)

    # Step 2: Fuzzy title dedup
    titles = df["title"].fillna("").tolist()
    to_keep = list(range(len(titles)))
    to_remove = set()

    for i in range(len(titles)):
        if i in to_remove:
            continue
        for j in range(i + 1, len(titles)):
            if j in to_remove:
                continue
            score = fuzz.token_sort_ratio(titles[i], titles[j])
            if score >= fuzzy_threshold:
                # Mantieni quello con più immagini
                img_i = 1 if is_valid_image_url(df.iloc[i].get("image_src", "")) else 0
                img_j = 1 if is_valid_image_url(df.iloc[j].get("image_src", "")) else 0
                if img_j > img_i:
                    to_remove.add(i)
                    eliminati_dedup.append({**df.iloc[j].to_dict(), "motivazione_eliminazione": f"fuzzy_dup_di: '{titles[i]}' (score={score})"})
                else:
                    to_remove.add(j)
                    eliminati_dedup.append({**df.iloc[i].to_dict(), "motivazione_eliminazione": f"fuzzy_dup_di: '{titles[j]}' (score={score})"})

    df_clean = df.iloc[[i for i in range(len(df)) if i not in to_remove]].reset_index(drop=True)
    df_eliminati_dedup = pd.DataFrame(eliminati_dedup)
    log.info(f"  [Dedup Fuzzy] Rimossi {len(to_remove)} duplicati fuzzy (threshold={fuzzy_threshold}).")
    return df_clean, df_eliminati_dedup


# ─────────────────────────────────────────────
# PROCESSING PIPELINE PRINCIPALE
# ─────────────────────────────────────────────

def process_csv(
    filepath: Path,
    output_dir: Path,
    fuzzy_threshold: int,
    global_stats: dict,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Pipeline completa in 7 fasi per un singolo CSV.
    Ritorna (df_core, df_eliminati).
    """
    log.info(f"\n{'='*60}")
    log.info(f"📂 Processing: {filepath.name}")
    log.info(f"{'='*60}")

    # ── LETTURA CSV ──────────────────────────────────────────────
    try:
        # Tenta prima con virgola, poi punto-e-virgola
        try:
            df = pd.read_csv(filepath, encoding="utf-8", sep=",", on_bad_lines="skip")
            if df.shape[1] < 3:
                raise ValueError("Troppo poche colonne, provo con punto-e-virgola")
        except Exception:
            df = pd.read_csv(filepath, encoding="utf-8", sep=";", on_bad_lines="skip")
    except UnicodeDecodeError:
        df = pd.read_csv(filepath, encoding="latin-1", sep=",", on_bad_lines="skip")
    except Exception as e:
        log.error(f"  ❌ File corrotto o illeggibile: {e}")
        return pd.DataFrame(), pd.DataFrame()

    righe_originali = len(df)
    log.info(f"  📊 Righe lette: {righe_originali}")
    global_stats["righe_totali"] += righe_originali
    global_stats["file_processati"].append(filepath.name)

    df = normalize_columns(df)
    eliminati_totali = []

    # ── FASE 1: NORMALIZZAZIONE ──────────────────────────────────
    log.info("  [Fase 1] Normalizzazione...")

    # Assicura colonne minime
    for col in ["title", "price", "compare_at_price", "image_src", "category", "sku", "tags", "description"]:
        if col not in df.columns:
            df[col] = None

    # Pulisci prezzi
    df["price"] = df["price"].apply(clean_price)
    df["compare_at_price"] = df["compare_at_price"].apply(clean_price)

    # Strip stringhe
    str_cols = ["title", "category", "sku", "tags", "description", "image_src"]
    for col in str_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().replace("nan", None).replace("", None)

    # Amazon URL: cerca colonna amazon_url o product_url
    url_col = None
    for candidate in ["amazon_url", "product_url", "url", "link"]:
        if candidate in df.columns:
            url_col = candidate
            break

    if url_col:
        df["amazon_url_clean"] = df[url_col].apply(extract_amazon_asin)
    else:
        df["amazon_url_clean"] = None

    # ── FASE 2: DEDUPLICAZIONE ───────────────────────────────────
    log.info("  [Fase 2] Deduplicazione...")
    df, df_dedup_elim = deduplicate(df, fuzzy_threshold)
    if not df_dedup_elim.empty:
        df_dedup_elim["motivazione_fase"] = "deduplicazione"
        eliminati_totali.append(df_dedup_elim)
    global_stats["duplicati_rimossi"] += len(df_dedup_elim)

    # ── FASE 3: FLAG NO_IMAGE ────────────────────────────────────
    log.info("  [Fase 3] Flag no_image...")
    mask_no_img = ~df["image_src"].apply(is_valid_image_url)
    df_no_img = df[mask_no_img].copy()
    df_no_img["motivazione_eliminazione"] = "no_immagine_valida"
    df_no_img["motivazione_fase"] = "no_image"
    if not df_no_img.empty:
        eliminati_totali.append(df_no_img)
    df = df[~mask_no_img].reset_index(drop=True)
    log.info(f"    Rimossi {len(df_no_img)} prodotti senza immagine.")
    global_stats["no_image"] += len(df_no_img)

    # ── FASE 4: FLAG PREZZO FOLLE ────────────────────────────────
    log.info("  [Fase 4] Flag prezzi anomali...")
    price_flags = df.apply(
        lambda r: is_prezzo_folle(r["price"], r["compare_at_price"], str(r["category"])),
        axis=1
    )
    df["_price_folle"] = price_flags.apply(lambda x: x[0])
    df["_price_motivo"] = price_flags.apply(lambda x: x[1])

    df_price_folle = df[df["_price_folle"]].copy()
    df_price_folle["motivazione_eliminazione"] = df_price_folle["_price_motivo"]
    df_price_folle["motivazione_fase"] = "prezzo_anomalo"
    if not df_price_folle.empty:
        eliminati_totali.append(df_price_folle)
    df = df[~df["_price_folle"]].drop(columns=["_price_folle", "_price_motivo"]).reset_index(drop=True)
    log.info(f"    Rimossi {len(df_price_folle)} prodotti con prezzo anomalo.")
    global_stats["prezzi_folli"] += len(df_price_folle)

    # ── FASE 5: CLASSIFICAZIONE KERNEL SECURITY ──────────────────
    log.info("  [Fase 5] Classificazione Kernel Security...")
    classifications = df.apply(classify_product, axis=1)
    df["status"] = classifications.apply(lambda x: x[0])
    df["motivazione_eliminazione"] = classifications.apply(lambda x: x[1])

    df_core = df[df["status"] == "CORE"].copy()
    df_elimina = df[df["status"] == "ELIMINA"].copy()
    df_elimina["motivazione_fase"] = "classificazione"
    if not df_elimina.empty:
        eliminati_totali.append(df_elimina)
    log.info(f"    CORE: {len(df_core)} | ELIMINA: {len(df_elimina)}")
    global_stats["core"] += len(df_core)
    global_stats["eliminati"] += len(df_elimina)

    # ── FASE 6: PULIZIA DESCRIZIONE E TAGS ───────────────────────
    log.info("  [Fase 6] Pulizia descrizione e tags...")
    df_core["description"] = df_core["description"].apply(
        lambda x: strip_html(str(x))[:5000] if pd.notna(x) else ""
    )
    # Auto-genera tags se vuoti
    df_core["tags"] = df_core.apply(
        lambda r: r["tags"] if pd.notna(r["tags"]) and r["tags"] else generate_tags(r["title"]),
        axis=1
    )

    # ── FASE 7: AGGIUNGI COLONNE FINALI ──────────────────────────
    log.info("  [Fase 7] Finalizzazione colonne...")

    # Raccoglie TUTTE le immagini disponibili
    img_cols = [c for c in df_core.columns if re.match(r"(image|img|picture)", c, re.I)]

    def collect_images(row):
        images = []
        for col in img_cols:
            val = str(row.get(col, "")).strip()
            if is_valid_image_url(val):
                images.append(val)
        # Colonna "images" con separatori
        if "images" in row and pd.notna(row["images"]):
            for url in re.split(r"[,|;]", str(row["images"])):
                url = url.strip()
                if is_valid_image_url(url) and url not in images:
                    images.append(url)
        # Rimuovi duplicati mantenendo ordine
        seen = set()
        unique_images = []
        for img in images:
            if img not in seen:
                seen.add(img)
                unique_images.append(img)
        return unique_images

    df_core["all_images"] = df_core.apply(collect_images, axis=1)
    df_core["images_count"] = df_core["all_images"].apply(len)
    global_stats["immagini_totali"] += df_core["images_count"].sum()

    # Handle slug
    if "handle" in df_core.columns:
        df_core["slug"] = df_core["handle"].fillna(
            df_core["title"].apply(lambda t: re.sub(r"[^a-z0-9]+", "-", str(t).lower()).strip("-"))
        )
    else:
        df_core["slug"] = df_core["title"].apply(
            lambda t: re.sub(r"[^a-z0-9]+", "-", str(t).lower()).strip("-")
        )

    # ── SALVA OUTPUT ─────────────────────────────────────────────
    stem = filepath.stem
    df_core_out = df_core.drop(columns=["motivazione_eliminazione"], errors="ignore")
    df_core_out.to_csv(output_dir / f"{stem}_cleaned.csv", index=False, encoding="utf-8")

    # Unisci tutti gli eliminati
    if eliminati_totali:
        df_all_eliminati = pd.concat(eliminati_totali, ignore_index=True)
        df_all_eliminati.to_csv(output_dir / f"{stem}_eliminati.csv", index=False, encoding="utf-8")
        log.info(f"  ✅ Salvato: {stem}_cleaned.csv ({len(df_core)} righe CORE)")
        log.info(f"  🗑️  Salvato: {stem}_eliminati.csv ({len(df_all_eliminati)} righe eliminate)")
    else:
        log.info(f"  ✅ Salvato: {stem}_cleaned.csv ({len(df_core)} righe CORE)")

    return df_core, pd.concat(eliminati_totali, ignore_index=True) if eliminati_totali else pd.DataFrame()


# ─────────────────────────────────────────────
# REPORT FINALE
# ─────────────────────────────────────────────

def generate_report(stats: dict, output_dir: Path):
    """Genera REPORT_PULIZIA_KERNEL.md con statistiche complete."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    perc_riduzione = (
        round((stats["eliminati"] + stats["duplicati_rimossi"] + stats["no_image"] + stats["prezzi_folli"])
              / max(stats["righe_totali"], 1) * 100, 1)
    )

    report = f"""# 🛡️ KERNEL SECURITY – REPORT PULIZIA CATALOGO
*Generato il: {now}*

---

## 📊 STATISTICHE TOTALI

| Metrica | Valore |
|---------|--------|
| File processati | {len(stats["file_processati"])} |
| Righe totali lette | {stats["righe_totali"]} |
| ✅ Prodotti CORE (tenuti) | **{stats["core"]}** |
| 🗑️ Prodotti ELIMINATI | {stats["eliminati"]} |
| 🔄 Duplicati rimossi | {stats["duplicati_rimossi"]} |
| 🖼️ No image rimossi | {stats["no_image"]} |
| 💰 Prezzi folli rimossi | {stats["prezzi_folli"]} |
| 📸 Immagini totali raccolte | {stats["immagini_totali"]} |
| 📉 **% Riduzione catalogo** | **{perc_riduzione}%** |

---

## 📁 FILE PROCESSATI

{chr(10).join(f"- `{f}`" for f in stats["file_processati"])}

---

## 🎯 PRODOTTI CORE PER CATEGORIA

Il catalogo finale `catalogo_kernel_unificato.csv` contiene **{stats["core"]} prodotti** 
focalizzati su:

1. **Bundle Tattici** – Kit multi-prodotto ad alto valore (flagship)
2. **Crypto & Cold Storage** – Trezor, NGRAVE, Cypherock, ColdCard, BitBox
3. **Smart Security & Survival EDC** – Faraday, Privacy Screens, Data Blocker, Kit sopravvivenza

---

## 🔧 RACCOMANDAZIONI BUSINESS

{"⚠️ **ATTENZIONE:** Hai eliminato il " + str(perc_riduzione) + "% del catalogo originale." if perc_riduzione > 50 else "✅ Riduzione catalogo ottimale."}

- Il catalogo è ora **focalizzato al 100%** su Kernel Security
- Hai **{stats["core"]} prodotti** altamente rilevanti vs un catalogo generico precedente
- **Immagini totali:** {stats["immagini_totali"]} – gallerie prodotto ricche e complete
- **Prossimo step:** Esegui `npm run import-catalog` per generare `data/products.ts`

### Azioni raccomandate:
1. Revisionare manualmente `*_eliminati.csv` per recuperare eventuali falsi positivi
2. Aggiungere campi `amazon_url` mancanti ai prodotti CORE senza link
3. Completare le immagini dei prodotti con meno di 3 foto
4. Impostare prezzi `compare_at_price` per mostrare sconti reali

---
*Script: clean_magazzino_kernel.py v2.0 | Kernel Security Pipeline*
"""

    report_path = output_dir / "REPORT_PULIZIA_KERNEL.md"
    report_path.write_text(report, encoding="utf-8")
    log.info(f"\n📄 Report salvato: {report_path}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Kernel Security Catalog Cleaner – Pipeline in 7 fasi"
    )
    parser.add_argument("--input_dir", default="magazzino", help="Cartella con i CSV da pulire")
    parser.add_argument("--output_dir", default="magazzino_pulito", help="Cartella output")
    parser.add_argument("--fuzzy_threshold", type=int, default=88, help="Soglia fuzzy matching (0-100)")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        log.error(f"❌ Cartella input non trovata: {input_dir}")
        sys.exit(1)

    csv_files = list(input_dir.glob("*.csv"))
    if not csv_files:
        log.error(f"❌ Nessun file CSV trovato in: {input_dir}")
        sys.exit(1)

    log.info(f"\n🛡️  KERNEL SECURITY CATALOG CLEANER v2.0")
    log.info(f"📂 Input: {input_dir} ({len(csv_files)} CSV trovati)")
    log.info(f"📤 Output: {output_dir}")
    log.info(f"🔍 Fuzzy threshold: {args.fuzzy_threshold}\n")

    # Statistiche globali
    global_stats = {
        "righe_totali": 0,
        "core": 0,
        "eliminati": 0,
        "duplicati_rimossi": 0,
        "no_image": 0,
        "prezzi_folli": 0,
        "immagini_totali": 0,
        "file_processati": [],
    }

    all_core_dfs = []

    # Processa ogni CSV con progress bar
    for csv_file in tqdm(csv_files, desc="🔄 Processing CSV", unit="file"):
        df_core, _ = process_csv(csv_file, output_dir, args.fuzzy_threshold, global_stats)
        if not df_core.empty:
            all_core_dfs.append(df_core)

    # ── MASTER CATALOG ───────────────────────────────────────────
    if all_core_dfs:
        log.info("\n🔗 Unificazione catalogo master...")
        master_df = pd.concat(all_core_dfs, ignore_index=True)

        # Deduplicazione globale finale
        master_df, _ = deduplicate(master_df, args.fuzzy_threshold)

        master_path = output_dir / "catalogo_kernel_unificato.csv"
        master_df.to_csv(master_path, index=False, encoding="utf-8")
        log.info(f"✅ MASTER CATALOG: {master_path} ({len(master_df)} prodotti CORE)")
        global_stats["core"] = len(master_df)  # aggiorna con dedup globale
    else:
        log.warning("⚠️ Nessun prodotto CORE trovato!")

    # ── REPORT ───────────────────────────────────────────────────
    generate_report(global_stats, output_dir)

    log.info(f"\n{'='*60}")
    log.info(f"🛡️  PIPELINE COMPLETATA")
    log.info(f"   ✅ CORE: {global_stats['core']} prodotti")
    log.info(f"   🗑️  Eliminati: {global_stats['eliminati']}")
    log.info(f"   📸 Immagini: {global_stats['immagini_totali']}")
    log.info(f"{'='*60}\n")


if __name__ == "__main__":
    main()
