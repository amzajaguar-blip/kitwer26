import type { BlogPost } from '@/lib/blog/types';

export const selfCustody2026: BlogPost = {
  slug:           'guida-self-custody-bitcoin-2026',
  title:          'Guida Self-Custody Bitcoin & Crypto 2026: Protocollo Completo',
  seoTitle:       'Guida Self-Custody Crypto 2026: Hardware Wallet e Backup',
  seoDescription: 'Come proteggere Bitcoin e crypto con self-custody nel 2026. Guida: hardware wallet, seed backup in acciaio, setup air-gap. Prodotti testati, prezzi reali.',
  excerpt:        'Nel 2026, lasciare le crypto su un exchange non è un rischio di mercato — è un rischio operativo. Questa guida copre il protocollo completo per la self-custody: dalla scelta del wallet al backup indistruttibile della seed phrase.',
  author:         'Kitwer26 Tactical Team',
  authorRole:     'Crypto Security Strategist',
  updatedAt:      '2026-04-08',
  category:       'Crypto Security',
  tags:           ['self custody', 'bitcoin', 'hardware wallet', 'cold storage', 'seed phrase', 'ledger', 'trezor', 'billfodl', 'crypto sicurezza 2026'],
  winnerProductId: 'CRYPTO-FORTRESS',
  winnerLabel:    'Crypto Fortress Bundle',
  products: [
    // Entry-level
    { id: 'LEDGER-NANO-S-PLUS',  namePattern: 'Ledger Nano S Plus' },
    { id: 'TREZOR-MODEL-ONE',    namePattern: 'Trezor Model One' },
    { id: 'SAFEPAL-S1',          namePattern: 'SafePal S1' },
    // Mid-tier
    { id: 'LEDGER-NANO-X',       namePattern: 'Ledger Nano X' },
    { id: 'TREZOR-SAFE-3',       namePattern: 'Trezor Safe 3' },
    // Pro/Air-gap
    { id: 'ELLIPAL-TITAN',       namePattern: 'Ellipal Titan' },
    { id: 'LEDGER-FLEX',         namePattern: 'Ledger Flex' },
    // Backup seed
    { id: 'BILLFODL-STEEL',      namePattern: 'Billfodl Steel Seed' },
    { id: 'BILLFODL-TITANIUM',   namePattern: 'Billfodl Titanium' },
    { id: 'CRYPTOSTEEL-CAPSULE', namePattern: 'CryptoSteel Capsule' },
    // Bundle
    { id: 'CRYPTO-FORTRESS',     namePattern: 'Kitwer26 Crypto Fortress Bundle' },
  ],
  faq: [
    {
      question: 'Cos\'è la self-custody e perché è importante nel 2026?',
      answer:   'Self-custody significa controllare direttamente le proprie chiavi private, senza affidarsi a exchange o custodi terzi. Nel 2026, con attacchi phishing AI-assisted, fallimenti exchange e sanzioni governative, chi non controlla le proprie chiavi non controlla le proprie crypto. "Not your keys, not your coins" non è un detto — è un protocollo.',
    },
    {
      question: 'Qual è il miglior hardware wallet per principianti?',
      answer:   'Ledger Nano S Plus (€79) è il punto di ingresso ottimale: supporta 5500+ asset, interfaccia Ledger Live intuitiva, Secure Element certificato. Per chi vuole open source al 100% dal primo giorno: Trezor Model One a €69.',
    },
    {
      question: 'Devo davvero comprare una piastra in acciaio per il backup della seed phrase?',
      answer:   'Sì, se il tuo portfolio vale più di €1000. La carta brucia a 233°C, si deteriora con l\'umidità e si strappa. La Billfodl Steel resiste a 1200°C, è impermeabile e indistruttibile. Proteggere €10.000 di Bitcoin con €89 di acciaio è il miglior ROI in crypto security.',
    },
    {
      question: 'La differenza tra hardware wallet air-gapped e normale?',
      answer:   'Un hardware wallet standard si connette al PC via USB o Bluetooth per firmare transazioni. Un air-gapped wallet (Ellipal Titan, SafePal S1) firma offline via QR code — non tocca mai internet. Per HODL a lungo termine con grandi capitali, l\'air-gap elimina qualsiasi vettore di attacco remoto.',
    },
    {
      question: 'Posso usare un hardware wallet con iPhone?',
      answer:   'Ledger Nano X sì — si connette via Bluetooth all\'app Ledger Live su iOS. Trezor richiede adattatore USB-C o Lightning. Ledger Flex ha Bluetooth e NFC nativo. Per chi usa principalmente mobile, Ledger è l\'ecosistema più integrato.',
    },
    {
      question: 'Dove comprare hardware wallet originali in Italia?',
      answer:   'Solo da siti ufficiali o rivenditori autorizzati come Amazon.it con tag verificato. Non comprare mai da eBay, Vinted o reseller anonimi — i wallet potrebbero essere compromessi prima della consegna. Kitwer26 linka solo prodotti su Amazon.it con tag affiliato verificato.',
    },
  ],
  sections: [
    {
      type:    'markdown',
      content: `Nel 2026, l'industria crypto ha registrato oltre **$2.3 miliardi di perdite** per hack di exchange, phishing e attacchi SIM-swapping. In tutti i casi, la vittima aveva una cosa in comune: non controllava le proprie chiavi private.

Self-custody non è per paranoici — è il protocollo minimo per chiunque detenga crypto con valore reale. Questa guida ti porta dall'acquisto del primo wallet alla ridondanza del backup in acciaio inox, step by step.`,
    },
    {
      type: 'image_placeholder',
      id:   1,
      alt:  'Hardware wallet Ledger, Trezor e Billfodl su superficie metallica — setup self-custody completo',
    },
    {
      type: 'markdown',
      content: `## I 3 Livelli di Self-Custody: Quale Ti Serve?

Non esiste un setup universale. Il livello di sicurezza ottimale dipende dal valore del tuo portfolio e dalla frequenza di utilizzo.`,
    },
    {
      type:    'comparison_table',
      headers: ['Livello', 'Portfolio Target', 'Hardware Consigliato', 'Backup Seed', 'Costo Setup'],
      rows: [
        ['Entry (Livello 1)',  '€500 – €5.000',   'Ledger Nano S Plus o Trezor Model One', 'Carta + busta ignifuga', '€79–89'],
        ['Mid (Livello 2)',    '€5.000 – €50.000', 'Ledger Nano X o Trezor Safe 3',         'Billfodl Steel',         '€238–288'],
        ['Pro (Livello 3)',    '€50.000+',         'Ellipal Titan 2.0 (air-gap)',            'Billfodl Titanium x2',   '€367+'],
      ],
    },
    {
      type: 'markdown',
      content: `## Livello 1 — Entry: Il Minimo Indispensabile (€79–89)

Se sei nuovo nella self-custody o il tuo portfolio è sotto i €5.000, l'obiettivo è uscire dal custodial (exchange) e avere le chiavi in mano. Senza over-engineering.

### Ledger Nano S Plus — Il Punto di Ingresso Ufficiale`,
    },
    { type: 'product_card', productId: 'LEDGER-NANO-S-PLUS' },
    {
      type: 'markdown',
      content: `**Perché funziona:** Secure Element certificato CC EAL5+, Ledger Live supporta 5500+ asset, interfaccia da ufficio — non da bunker. Per Bitcoin, Ethereum e i principali token è più che sufficiente.

**Limite:** Solo USB, nessun Bluetooth. Per mobile serve adattatore.

### Trezor Model One — La Scelta Open Source`,
    },
    { type: 'product_card', productId: 'TREZOR-MODEL-ONE' },
    {
      type: 'markdown',
      content: `**Perché funziona:** Firmware 100% open source, auditabile da chiunque. Trezor Suite (desktop) è l'interfaccia più trasparente del mercato. Ideale per chi vuole verificare ogni riga di codice.

**Limite:** Chip standard (non Secure Element), display monocromatico base.

### SafePal S1 — Air-Gap a Prezzo Entry`,
    },
    { type: 'product_card', productId: 'SAFEPAL-S1' },
    {
      type: 'markdown',
      content: `**Perché funziona:** Completamente air-gapped (QR code only, zero cavi), batteria integrata, supporto multi-chain. A €49 è il modo più economico per avere un wallet che non tocca mai internet.

**Limite:** Software meno maturo di Ledger/Trezor, ecosistema DeFi limitato.

---

## Livello 2 — Mid: Il Setup Standard per Portfolio Seri (€238–288)

Tra €5.000 e €50.000, la domanda non è "mi serve un hardware wallet?" ma "quale setup minimizza tutti i vettori di attacco?"

### Ledger Nano X — Il Più Versatile`,
    },
    { type: 'product_card', productId: 'LEDGER-NANO-X' },
    {
      type: 'markdown',
      content: `**Il vantaggio chiave:** Bluetooth crittografato + app mobile = firma transazioni DeFi ovunque, senza cavi. Per chi gestisce portfolio attivamente (staking, DeFi, NFT), il Nano X è lo standard de facto.

### Trezor Safe 3 — Il Bunker Open Source`,
    },
    { type: 'product_card', productId: 'TREZOR-SAFE-3' },
    {
      type: 'markdown',
      content: `**Il vantaggio chiave:** Chip SLS32AIA certificato EAL6+ (un livello sopra Ledger), firmware open source, assenza totale di wireless. Per HODL senza movimenti frequenti, il Safe 3 è il wallet con la superficie di attacco più ridotta.

---

## Livello 3 — Pro: Air-Gap Totale per Grandi Capitali (€169–369)

Sopra i €50.000 in crypto, ogni connessione a internet è un rischio che non devi accettare. Il protocollo cambia: firma offline, verifica su dispositivo fisico, zero interazione digitale.`,
    },
    { type: 'product_card', productId: 'ELLIPAL-TITAN' },
    {
      type: 'markdown',
      content: `**Come funziona:** il wallet non ha nessuna porta USB, nessun Bluetooth, nessun Wi-Fi. Per firmare una transazione: crei il TX non firmato su app mobile → trasmetti via QR → Ellipal firma → scansioni il QR di ritorno → broadcast. Zero interazione digitale, zero vettori di attacco remoto.`,
    },
    {
      type: 'image_placeholder',
      id:   4,
      alt:  'Flusso transazione air-gapped Ellipal Titan — QR code signing senza connessioni fisiche',
    },
    {
      type: 'markdown',
      content: `## IL KILLSHOT: Il Problema che Nessuno Ti Dice

Hai il miglior hardware wallet del mercato. Il setup è perfetto. Poi succede un incendio, un'alluvione, o semplicemente perdi il dispositivo.

**La tua seed phrase — le 24 parole — è scritta su un foglio di carta.**

In quel momento, tutto il tuo portfolio dipende da un pezzo di carta che brucia a 233°C, si distrugge con l'acqua e sbiadisce nel tempo. Il wallet è protetto. La seed non lo è.

---

## Il Backup della Seed Phrase: L'Unica Cosa Che Conta

### Billfodl Steel Seed Plate — Il Riferimento del Settore`,
    },
    { type: 'product_card', productId: 'BILLFODL-STEEL' },
    {
      type: 'markdown',
      content: `**Specifiche:** acciaio inossidabile 316L, resistenza al fuoco 1200°C, impermeabile, anti-corrosione. Le lettere della seed vengono inserite fisicamente in slot metallici — nessuna incisione che può sbiadire.

**Come funziona:** ogni slot contiene le prime 4 lettere di ogni parola seed (il dizionario BIP39 è univoco con 4 lettere). 24 slot = backup completo di qualsiasi seed a 12 o 24 parole.

### Billfodl Titanium — Per Portfolio da 6 Cifre`,
    },
    { type: 'product_card', productId: 'BILLFODL-TITANIUM' },
    {
      type: 'markdown',
      content: `**La differenza:** titanio grade 5 invece di acciaio. Resistenza meccanica superiore, peso ridotto, indistinguibile visivamente da un fermaglio o chiave — nessun "questo è il mio backup crypto" visibile.

**Raccomandazione Kitwer26:** se il portfolio supera €20.000, crea **2 copie fisiche** su Billfodl Titanium conservate in 2 luoghi fisici distinti (casa + cassaforte bancaria o parente di fiducia).

### CryptoSteel Capsule — Il Formato Compatto`,
    },
    { type: 'product_card', productId: 'CRYPTOSTEEL-CAPSULE' },
    {
      type: 'markdown',
      content: `**Il vantaggio:** formato capsule ermetica, inseribile in cassaforte o nascondibile fisicamente. Resistenza al fuoco 1400°C. Ottimo come seconda copia di backup per chi preferisce un formato compatto.

---

## Il Setup Definitivo: Crypto Fortress Bundle

Per chi non vuole ottimizzare pezzo per pezzo, Kitwer26 ha assemblato il setup completo: hardware wallet + piastra seed in acciaio. Un unico acquisto, zero compromessi.`,
    },
    {
      type: 'image_placeholder',
      id:   5,
      alt:  'Crypto Fortress Bundle — hardware wallet + Billfodl Steel su sfondo tattico, setup completo self-custody',
    },
    { type: 'product_card', productId: 'CRYPTO-FORTRESS' },
    {
      type: 'markdown',
      content: `## Checklist Operativa: Setup Self-Custody in 60 Minuti

**Step 1 — Acquisto sicuro (5 min)**
- Compra solo da produttore ufficiale o Amazon.it con tag verificato
- Verifica la confezione sigillata all'arrivo
- Non usare mai un wallet di seconda mano

**Step 2 — Inizializzazione (15 min)**
- Connetti il wallet a PC (mai su smartphone condivisi)
- Genera la seed phrase sul dispositivo — mai online, mai su PC
- La seed appare **solo** sullo schermo del wallet — non su PC

**Step 3 — Backup fisico (20 min)**
- Scrivi le 24 parole su carta temporanea
- Trascrivi immediatamente su Billfodl Steel (le prime 4 lettere di ogni parola)
- Verifica ogni slot prima di chiudere
- Distruggi la carta temporanea

**Step 4 — Verifica ridondanza (5 min)**
- Test recovery: resetta il wallet e recupera con la seed
- Se riesci → backup funziona
- Conserva Billfodl in luogo fisicamente sicuro (non insieme al wallet)

**Step 5 — Trasferimento (15 min)**
- Preleva le crypto dall'exchange
- Inizia con una transazione test piccola (€10–20)
- Verifica la ricezione sul wallet
- Poi trasferisci il resto

> **Regola d'oro:** il wallet può essere sostituito. La seed phrase non può. Proteggi la seed come se fosse il 100% del tuo portfolio — perché lo è.`,
    },
    {
      type: 'image_placeholder',
      id:   6,
      alt:  'Checklist self-custody: hardware wallet, Billfodl, cassaforte — protocollo operativo completo',
    },
    {
      type: 'markdown',
      content: `> **Il verdetto di Kitwer26:**
> - **Portfolio < €1.000:** Ledger Nano S Plus (€79) + backup carta + busta ignifuga. Non spendere di più.
> - **Portfolio €1.000–20.000:** Ledger Nano X o Trezor Safe 3 + Billfodl Steel. Questo è il setup minimo serio.
> - **Portfolio > €20.000:** Ellipal Titan air-gap + 2x Billfodl Titanium in luoghi separati. Nessun compromesso.
>
> In tutti i casi: mai lasciare crypto su un exchange oltre il tempo necessario per tradare. Not your keys, not your coins.`,
    },
  ],
};
