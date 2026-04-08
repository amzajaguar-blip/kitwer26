#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  KITWER26 — Import completo tutti i CSV
#  Esegui: ./run-import.sh
# ─────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

npx tsx scripts/kitwer-tools.ts import --hard-reset \
  MAGAZZINO/crypto_wallets.CSV \
  MAGAZZINO/comunicazioni.CSV \
  MAGAZZINO/smart_security.csv \
  MAGAZZINO/survival_edc.csv \
  MAGAZZINO/tactical_power.csv \
  MAGAZZINO/categoria_sim_racing.csv \
  MAGAZZINO/gamedesk.csv \
  MAGAZZINO/pc_hardwer.csv
