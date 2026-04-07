#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  KITWER-TOOLS — Launcher desktop universale
#  Doppio click dal Desktop oppure: bash kitwer.sh [cmd] [flags]
#
#  Comandi disponibili:
#    import          → Importa prodotti da CSV/XLSX
#    dedup           → De-duplicazione intelligente prodotti
#    variants        → Scraping varianti colore/taglia da Amazon
#    subcats         → Assegna sotto-categorie via keyword matching
#    fix-images      → Ripara URL immagini rotte nel DB
#    fill-gallery    → Recupera immagini mancanti via scraping (--limit=N, --dry-run)
#    sync-product-links → Sincronizza URL prodotti puliti
#    prices          → Migra e ricalcola prezzi da CSV
#    clean-db        → Svuota completamente la tabella products
#    stress-test     → Verifica integrità URL + purity check
#    verify          → Conteggio prodotti per categoria
#
#  Esempi:
#    ./kitwer.sh fill-gallery --limit=20
#    ./kitwer.sh fill-gallery --limit=50 --dry-run
#    ./kitwer.sh dedup --dry-run
# ══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colori
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}${CYAN}   KITWER-TOOLS — Kitwer26 Management Suite       ${RESET}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════${RESET}"
echo ""

# Verifica dipendenze
if ! command -v node &>/dev/null; then
  echo -e "${RED}[ERRORE] Node.js non trovato. Installa da https://nodejs.org${RESET}"
  read -rp "Premi INVIO per uscire..."
  exit 1
fi

if ! npx --yes tsx --version &>/dev/null 2>&1; then
  echo -e "${YELLOW}[SETUP] Installo tsx...${RESET}"
  npm install tsx --save-dev
fi

# Esegui lo script universale passando tutti gli argomenti
npx tsx scripts/kitwer-tools.ts "$@"

EXIT_CODE=$?
echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ Operazione completata.${RESET}"
else
  echo -e "${RED}${BOLD}✗ Operazione terminata con errori (codice $EXIT_CODE).${RESET}"
fi

# Se lanciato senza terminale (doppio click) → pausa finale
if [ -t 0 ]; then
  : # terminale interattivo, nessuna pausa necessaria
else
  read -rp "Premi INVIO per chiudere..."
fi
