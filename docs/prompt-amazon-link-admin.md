# Prompt per Claude: Aggiungere Link Amazon ai Prodotti nel Pannello Admin

## Obiettivo

L'obiettivo è estendere l'applicazione e-commerce esistente per consentire agli amministratori di aggiungere e gestire link di affiliazione Amazon per ciascun prodotto tramite un'interfaccia nel pannello di amministrazione. Questi link dovranno poi essere visualizzati nella pagina del catalogo prodotti.

## Stato Attuale dell'Applicazione

L'applicazione è un e-commerce basato su React (Vite), tRPC, Drizzle ORM e MySQL.

### 1. Struttura Dati Prodotti

Attualmente, i prodotti sono definiti in modo statico nel file `/home/ubuntu/kitwer26-ecommerce/shared/products.ts` come un array di oggetti `Product`. L'interfaccia `Product` è la seguente:

```typescript
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in cents (EUR)
  category: string;
  image?: string;
  inStock: boolean;
}
```

**Non esiste un campo dedicato per un link Amazon o URL esterno.**

### 2. Persistenza Dati (Database)

Il database (gestito con Drizzle ORM e MySQL) contiene tabelle solo per `users` e `orders` (`/home/ubuntu/kitwer26-ecommerce/drizzle/schema.ts` e `/home/ubuntu/kitwer26-ecommerce/server/db.ts`).

**Non esiste una tabella `products` nel database.** I dati dei prodotti sono attualmente hardcoded nel codice e non persistiti.

### 3. Pannello di Amministrazione (`Admin.tsx`)

Il pannello di amministrazione (`/home/ubuntu/kitwer26-ecommerce/client/src/pages/Admin.tsx`) è interamente dedicato alla **gestione degli ordini**. Permette di visualizzare, filtrare, processare (confermare e aggiungere tracking) e annullare gli ordini. **Non esiste alcuna interfaccia utente o funzionalità per la gestione dei prodotti.**

### 4. API (tRPC)

Le procedure tRPC relative ai prodotti (`trpc.products.list` e `trpc.products.getById` in `/home/ubuntu/kitwer26-ecommerce/server/routers.ts`) sono di sola lettura e restituiscono i dati dall'array statico `PRODUCTS`. **Non esistono procedure di mutazione (creazione, aggiornamento, eliminazione) per i prodotti.**

### 5. Frontend (Home.tsx)

La pagina principale (`/home/ubuntu/kitwer26-ecommerce/client/src/pages/Home.tsx`) visualizza il catalogo prodotti consumando direttamente l'array statico `PRODUCTS`. Non ci sono pagine di dettaglio prodotto individuali.

## Soluzione Proposta: Implementazione di una Gestione Prodotti con Link Amazon

Per implementare la funzionalità richiesta, si propone un approccio che prevede la persistenza dei prodotti nel database e l'aggiunta di una nuova sezione nel pannello di amministrazione.

### Passaggi Dettagliati per Claude

1.  **Modifica dello Schema del Database (Drizzle ORM):**
    *   Creare una nuova tabella `products` nel file `/home/ubuntu/kitwer26-ecommerce/drizzle/schema.ts`.
    *   La tabella `products` dovrebbe includere i seguenti campi:
        *   `id`: `varchar` (stringa, chiave primaria, unico, non nullo, es. UUID o slug come `ledger-nano-x`)
        *   `name`: `varchar` (stringa, non nullo)
        *   `description`: `text` (stringa, non nullo)
        *   `price`: `int` (numero intero, in centesimi, non nullo)
        *   `category`: `varchar` (stringa, non nullo, può essere un `mysqlEnum` se le categorie sono fisse)
        *   `image`: `varchar` (stringa, opzionale, URL dell'immagine)
        *   `inStock`: `boolean` (booleano, non nullo, default `true`)
        *   `amazonLink`: `varchar` (stringa, opzionale, URL del prodotto su Amazon)
    *   Eseguire una migrazione del database per creare la nuova tabella.

2.  **Migrazione Dati Esistenti:**
    *   Creare uno script una tantum per popolare la nuova tabella `products` nel database con i dati esistenti dall'array `PRODUCTS` in `/home/ubuntu/kitwer26-ecommerce/shared/products.ts`.
    *   Questo script dovrebbe essere eseguito solo una volta e poi rimosso o commentato.

3.  **Aggiornamento delle Funzioni di Accesso al Database (`server/db.ts`):**
    *   Aggiungere funzioni CRUD (Create, Read, Update, Delete) per la nuova tabella `products` in `/home/ubuntu/kitwer26-ecommerce/server/db.ts`.
        *   `createProduct(product: InsertProduct)`
        *   `getProductById(id: string)`
        *   `getAllProducts(category?: string)`
        *   `updateProduct(id: string, product: UpdateProduct)`
        *   `deleteProduct(id: string)`
    *   Modificare le funzioni `getProductById` e `getAllProducts` esistenti per recuperare i dati dal database invece che dall'array statico.

4.  **Creazione di Nuove Procedure tRPC per la Gestione Prodotti (`server/routers.ts`):**
    *   Creare un nuovo router tRPC sotto `admin` (es. `admin.products`) o un nuovo router di primo livello (es. `productsAdmin`) per gestire le operazioni CRUD sui prodotti.
    *   Definire le seguenti procedure, accessibili solo agli amministratori (`adminProcedure`):
        *   `admin.products.list`: Per elencare tutti i prodotti.
        *   `admin.products.getById`: Per ottenere i dettagli di un singolo prodotto.
        *   `admin.products.create`: Per creare un nuovo prodotto, includendo il campo `amazonLink`.
        *   `admin.products.update`: Per aggiornare un prodotto esistente, permettendo la modifica di `amazonLink`.
        *   `admin.products.delete`: Per eliminare un prodotto.
    *   Aggiornare le procedure `products.list` e `products.getById` esistenti per utilizzare le nuove funzioni di accesso al database.

5.  **Sviluppo dell'Interfaccia Utente del Pannello Admin (`client/src/pages/Admin.tsx` e nuovi componenti):**
    *   Creare un nuovo componente React (es. `AdminProducts.tsx`) che fornisca:
        *   Una tabella per visualizzare tutti i prodotti, con colonne per `id`, `name`, `price`, `category`, `inStock` e `amazonLink`.
        *   Pulsanti per modificare ed eliminare ciascun prodotto.
        *   Un pulsante per aggiungere un nuovo prodotto.
        *   Form modali o pagine dedicate per la creazione e la modifica dei prodotti, includendo un campo di input per `amazonLink` (con validazione URL).
    *   Integrare `AdminProducts.tsx` nel pannello `Admin.tsx` esistente. Si potrebbe aggiungere una nuova tab o una sezione dedicata per la gestione dei prodotti, accanto alla gestione degli ordini.

6.  **Aggiornamento della Visualizzazione Frontend (`client/src/pages/Home.tsx`):**
    *   Modificare il componente `Home.tsx` per recuperare i prodotti tramite le nuove procedure tRPC che leggono dal database.
    *   Aggiungere un elemento UI (es. un'icona o un pulsante 
accanto al pulsante "AGGIUNGI" al carrello) che, se `product.amazonLink` è presente, reindirizzi l'utente al link Amazon del prodotto. Questo elemento dovrebbe essere visibile solo se `amazonLink` è definito per il prodotto.

## Considerazioni Aggiuntive

*   **Validazione:** Assicurarsi che il campo `amazonLink` sia validato come URL valido sia lato client che lato server.
*   **Sicurezza:** Le operazioni CRUD sui prodotti devono essere protette e accessibili solo agli utenti con ruolo `admin`.
*   **Gestione Errori:** Implementare una gestione robusta degli errori per tutte le nuove API e componenti UI.
*   **UI/UX:** Mantenere la coerenza con lo stile e l'esperienza utente esistente dell'applicazione.

Questo prompt fornisce una roadmap chiara per l'implementazione della funzionalità richiesta, suddividendo il compito in passaggi gestibili e specificando le modifiche necessarie ai vari livelli dell'applicazione.
