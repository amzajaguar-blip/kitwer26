# CSV Product Import — Kitwer26

Skill per importare prodotti da CSV nel DB Supabase con tutte le regole Kitwer.

## Checklist

1. **Verifica formato CSV** — controlla separatore decimale europeo (virgola, es. `12,50` → `12.50`)
2. **Applica pricing formula** — `cost * 1.35` markup, arrotonda a prezzo psicologico (es. €29.99, €49.99)
3. **Slug unici** — genera slug dal nome, aggiungi `-2`, `-3`, ecc. per duplicati
4. **Mappa categorie** — usa nomi display hardcoded (MAI chiavi di traduzione o slug grezzi)
5. **Quality filter** — salta prodotti con rating < 4.2
6. **Budget King** — flagga `is_budget_king: true` se prezzo < 25€ E rating >= 4.5
7. **URL purity** — tronca link Amazon dopo l'ASIN, rimuovi tutti i tracker
8. **Esegui import** — usa `scripts/kitwer-tools.ts`
9. **Verifica conteggio** — il numero prodotti importati deve corrispondere alle righe CSV (escluse header e righe vuote)
10. **Controlla admin panel** — verifica che tutti i prodotti siano visibili correttamente

## Entry point

```bash
npx tsx scripts/kitwer-tools.ts --import MAGAZZINO/file.csv
```

## Note
- Entry point unico: `scripts/kitwer-tools.ts`
- Formato decimale: europeo (virgola), non US (punto)
- Duplicati slug: sempre suffisso incrementale, mai sovrascrivere
