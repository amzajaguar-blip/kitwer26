#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  KITWER-TOOLS wrapper
#  Uso: ./kitwer-tools.sh [comando] [opzioni]
#
#  Comandi disponibili:
#    import          → Importa CSV/XLSX da MAGAZZINO/
#    dedup           → De-duplicazione prodotti
#    variants        → Scraping varianti da Amazon
#    subcats         → Assegna sotto-categorie
#    fix-images      → Ripara URL immagini rotte
#    sync-product-links → Sincronizza product_url puliti
#    prices          → Migra/ricalcola prezzi da CSV
#    clean-db        → ⚠ Svuota tabella products
#    stress-test     → 🔗 Verifica URL + purity check + broken_links.json
#
#  Esempi:
#    ./kitwer-tools.sh import --hard-reset
#    ./kitwer-tools.sh stress-test
#    ./kitwer-tools.sh stress-test --concurrency=10 --fix-pure
#    ./kitwer-tools.sh stress-test --limit=50 --dry-run
# ─────────────────────────────────────────────────────────────────
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
exec npx tsx scripts/kitwer-tools.ts "$@"
