# Prompt per Claude: Automazione del Flusso di Acquisto "Master Maxx" per Kitwer26

## Obiettivo

L'obiettivo è automatizzare e migliorare il flusso di acquisto dell'e-commerce Kitwer26, integrando la gestione dei link di affiliazione Amazon per i prodotti e ottimizzando le notifiche e la gestione lato amministratore. Questo include la persistenza dei dati dei prodotti nel database, l'estensione del pannello admin e l'automazione delle comunicazioni post-acquisto.

## Analisi del Flusso Desiderato (da `pasted_content.txt`)

Il flusso di acquisto desiderato è il seguente:

1.  **CLIENTE clicca "Acquista" su un prodotto**
    *   `ProductCard / ProductDrawer / ProductPage`
    *   Redirect a `/checkout?pid=...&pname=...&price=...`

2.  **FORM SPEDIZIONE (`/checkout`)**
    *   Cliente compila: nome, cognome, email, telefono, indirizzo, CAP, città, provincia.
    *   Click "Paga con Carta" → `POST /api/checkout/stripe`.

3.  **API `/api/checkout/stripe`**
    *   Salva ordine su Supabase (status: `pending_stripe_payment`).
    *   Crea Stripe Customer (con indirizzo, per IVA automatica).
    *   Crea Stripe Checkout Session (con Stripe Tax auto: IVA EU / UK VAT / US Sales Tax).
    *   Ritorna `{ checkoutUrl }` → redirect cliente a Stripe.

4.  **STRIPE HOSTED CHECKOUT**
    *   Cliente inserisce carta / SEPA / iDEAL ecc.
    *   Paga.

5.  **WEBHOOK `/api/webhooks/stripe`**
    *   Stripe invia: `checkout.session.completed`.
    *   Verifica firma HMAC (sicurezza).
    *   Aggiorna ordine → status: `confirmed`.
    *   Invia email conferma al cliente (Resend).
    *   Invia email notifica admin (con link Amazon del prodotto).
    *   Genera PDF ricevuta con QR code.

6.  **CLIENTE → `/checkout/success`**
    *   Vede pagina conferma con numero ordine.

7.  **TU (admin) → `/admin`**
    *   Vedi ordine nella dashboard.
    *   Clicchi link Amazon del prodotto (affiliato).
    *   Acquisti il prodotto su Amazon con indirizzo del cliente.
    *   Marchi come "spedito" → cliente riceve email tracking.

## Stato Attuale dell'Applicazione Kitwer26

L'applicazione è un e-commerce basato su React (Vite), tRPC, Drizzle ORM e MySQL. Di seguito i punti chiave rilevati dall'analisi del codice:

*   **Prodotti Statici**: I prodotti sono attualmente definiti in modo statico nel file `/home/ubuntu/kitwer26-ecommerce/shared/products.ts` come un array di oggetti `Product`. L'interfaccia `Product` non include un campo per un link Amazon o URL esterno.
*   **Database (Drizzle ORM / MySQL)**: Il database contiene tabelle solo per `users` e `orders` (`/home/ubuntu/kitwer26-ecommerce/drizzle/schema.ts` e `/home/ubuntu/kitwer26-ecommerce/server/db.ts`). **Non esiste una tabella `products` nel database.** I dati dei prodotti sono hardcoded e non persistiti. **Nota**: Il flusso desiderato menziona Supabase, ma l'attuale implementazione utilizza MySQL con Drizzle ORM. Si procederà con MySQL/Drizzle.
*   **Pannello di Amministrazione (`Admin.tsx`)**: Il pannello (`/home/ubuntu/kitwer26-ecommerce/client/src/pages/Admin.tsx`) è dedicato esclusivamente alla gestione degli ordini. Non esiste alcuna interfaccia utente o funzionalità per la gestione dei prodotti.
*   **API (tRPC)**: Le procedure tRPC relative ai prodotti (`trpc.products.list` e `trpc.products.getById` in `/home/ubuntu/kitwer26-ecommerce/server/routers.ts`) sono di sola lettura e recuperano i dati dall'array statico. Non esistono procedure di mutazione (creazione, aggiornamento, eliminazione) per i prodotti.
*   **Frontend (`Home.tsx`)**: La pagina principale (`/home/ubuntu/kitwer26-ecommerce/client/src/pages/Home.tsx`) visualizza il catalogo prodotti consumando direttamente l'array statico `PRODUCTS`. Non ci sono pagine di dettaglio prodotto individuali.

## Task per Claude: Implementazione Dettagliata

Per automatizzare il flusso "Master Maxx", sono necessari i seguenti passaggi:

### 1. Modifica dello Schema del Database (Drizzle ORM)

*   **Creare una nuova tabella `products`** nel file `/home/ubuntu/kitwer26-ecommerce/drizzle/schema.ts`.
*   La tabella `products` dovrebbe includere i seguenti campi:
    *   `id`: `varchar` (stringa, chiave primaria, unico, non nullo, es. UUID o slug come `ledger-nano-x`)
    *   `name`: `varchar` (stringa, non nullo)
    *   `description`: `text` (stringa, non nullo)
    *   `price`: `int` (numero intero, in centesimi, non nullo)
    *   `category`: `varchar` (stringa, non nullo, può essere un `mysqlEnum` se le categorie sono fisse)
    *   `image`: `varchar` (stringa, opzionale, URL dell'immagine)
    *   `inStock`: `boolean` (booleano, non nullo, default `true`)
    *   `amazonLink`: `varchar` (stringa, opzionale, URL del prodotto su Amazon)
*   **Eseguire una migrazione del database** per creare la nuova tabella.

### 2. Migrazione Dati Esistenti

*   Creare uno script una tantum per popolare la nuova tabella `products` nel database con i dati esistenti dall'array `PRODUCTS` in `/home/ubuntu/kitwer26-ecommerce/shared/products.ts`.
*   Questo script dovrebbe essere eseguito solo una volta e poi rimosso o commentato.

### 3. Aggiornamento delle Funzioni di Accesso al Database (`server/db.ts`)

*   Aggiungere funzioni CRUD (Create, Read, Update, Delete) per la nuova tabella `products` in `/home/ubuntu/kitwer26-ecommerce/server/db.ts`:
    *   `createProduct(product: InsertProduct)`
    *   `getProductById(id: string)`
    *   `getAllProducts(category?: string)`
    *   `updateProduct(id: string, product: UpdateProduct)`
    *   `deleteProduct(id: string)`
*   Modificare le funzioni `getProductById` e `getAllProducts` esistenti per recuperare i dati dal database invece che dall'array statico.

### 4. Creazione di Nuove Procedure tRPC per la Gestione Prodotti (`server/routers.ts`)

*   Creare un nuovo router tRPC sotto `admin` (es. `admin.products`) o un nuovo router di primo livello (es. `productsAdmin`) per gestire le operazioni CRUD sui prodotti.
*   Definire le seguenti procedure, accessibili solo agli amministratori (`adminProcedure`):
    *   `admin.products.list`: Per elencare tutti i prodotti.
    *   `admin.products.getById`: Per ottenere i dettagli di un singolo prodotto.
    *   `admin.products.create`: Per creare un nuovo prodotto, includendo il campo `amazonLink`.
    *   `admin.products.update`: Per aggiornare un prodotto esistente, permettendo la modifica di `amazonLink`.
    *   `admin.products.delete`: Per eliminare un prodotto.
*   Aggiornare le procedure `products.list` e `products.getById` esistenti per utilizzare le nuove funzioni di accesso al database.

### 5. Sviluppo dell'Interfaccia Utente del Pannello Admin (`client/src/pages/Admin.tsx` e nuovi componenti)

*   Creare un nuovo componente React (es. `AdminProducts.tsx`) che fornisca:
    *   Una tabella per visualizzare tutti i prodotti, con colonne per `id`, `name`, `price`, `category`, `inStock` e `amazonLink`.
    *   Pulsanti per modificare ed eliminare ciascun prodotto.
    *   Un pulsante per aggiungere un nuovo prodotto.
    *   Form modali o pagine dedicate per la creazione e la modifica dei prodotti, includendo un campo di input per `amazonLink` (con validazione URL).
*   Integrare `AdminProducts.tsx` nel pannello `Admin.tsx` esistente. Si potrebbe aggiungere una nuova tab o una sezione dedicata per la gestione dei prodotti, accanto alla gestione degli ordini.

### 6. Aggiornamento della Visualizzazione Frontend (`client/src/pages/Home.tsx`)

*   Modificare il componente `Home.tsx` per recuperare i prodotti tramite le nuove procedure tRPC che leggono dal database.
*   Aggiungere un elemento UI (es. un'icona o un pulsante accanto al pulsante "AGGIUNGI" al carrello) che, se `product.amazonLink` è presente, reindirizzi l'utente al link Amazon del prodotto. Questo elemento dovrebbe essere visibile solo se `amazonLink` è definito per il prodotto.

### 7. Automazione Post-Acquisto (Webhook Stripe - `/api/webhooks/stripe`)

*   **Modificare la logica del webhook** in `/home/ubuntu/kitwer26-ecommerce/server/routers.ts` (o dove gestito il webhook Stripe).
*   Quando riceve l'evento `checkout.session.completed`:
    *   Recuperare i dettagli dell'ordine, inclusi i `productId` degli articoli acquistati.
    *   Per ogni `productId`, recuperare il `amazonLink` corrispondente dal database.
    *   **Inviare email notifica admin**: Includere i `amazonLink` di tutti i prodotti acquistati in questa email, in modo che l'amministratore possa facilmente cliccare e procedere all'acquisto su Amazon.
    *   **Generazione PDF ricevuta con QR code**: Implementare la generazione di un PDF con i dettagli dell'ordine e un QR code (il QR code potrebbe puntare alla pagina di tracking dell'ordine o a un link generico del sito). Sarà necessario integrare una libreria per la generazione di PDF (es. `pdfkit` o `jsPDF` lato server, o `react-pdf` lato client se la generazione avviene lì).

### 8. Gestione Ordini Admin (`/admin`)

*   Assicurarsi che la dashboard admin (`Admin.tsx`) visualizzi chiaramente i prodotti di ogni ordine e, se disponibili, i relativi `amazonLink` per facilitare l'azione manuale dell'admin (acquisto su Amazon).
*   La funzionalità di "Marchi come spedito" dovrebbe rimanere e, una volta attivata, inviare l'email di tracking al cliente.

## Considerazioni Aggiuntive

*   **Validazione**: Assicurarsi che il campo `amazonLink` sia validato come URL valido sia lato client che lato server.
*   **Sicurezza**: Tutte le nuove operazioni CRUD sui prodotti e le modifiche al webhook devono essere protette e accessibili solo agli utenti con ruolo `admin` o tramite meccanismi di sicurezza appropriati (es. verifica HMAC per i webhook).
*   **Gestione Errori**: Implementare una gestione robusta degli errori per tutte le nuove API e componenti UI.
*   **UI/UX**: Mantenere la coerenza con lo stile e l'esperienza utente esistente dell'applicazione.
*   **Dipendenze**: Se necessario, installare nuove dipendenze per la generazione di PDF o altre funzionalità.

Questo prompt fornisce una roadmap chiara e dettagliata per l'implementazione della funzionalità richiesta, suddividendo il compito in passaggi gestibili e specificando le modifiche necessarie ai vari livelli dell'applicazione Kitwer26 Master Maxx.
