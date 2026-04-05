import React from 'react';

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-th-subtle py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-[#0a0a0a] border border-white/10 p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-black text-white mb-8 uppercase tracking-tight">
          Politica di Reso e Rimborsi <span className="text-cyan-500">Kitwer 2026</span>
        </h1>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-2">1. Diritto di Recesso (14 Giorni)</h2>
            <p>
              Ai sensi dell&apos;art. 52 del Codice del Consumo (D.Lgs. 206/2005), hai il diritto di recedere dal contratto, senza indicarne le ragioni, entro 14 giorni da quando tu o un terzo incaricato (diverso dal corriere) ha ricevuto fisicamente la merce.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">2. Condizioni per l&apos;accettazione del Reso</h2>
            <p>Affinché il reso venga accettato e rimborsato, il prodotto deve rispettare le seguenti condizioni:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Il prodotto deve essere integro e restituito nella sua confezione originale.</li>
              <li>Non deve presentare segni di usura, graffi o danni causati da un montaggio errato (particolarmente valido per i componenti PC e Sim Racing).</li>
              <li>Tutti gli accessori, cavi e manuali originali devono essere inclusi nella scatola.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-cyan-500 mb-2">3. Eccezioni Fondamentali (Crypto Wallets)</h2>
            <p>
              Per motivi di sicurezza bancaria e crittografica, <strong>gli Hardware Wallet (es. Ledger, Trezor, CoolWallet) NON possono essere resi se il sigillo di garanzia è stato infranto o se il dispositivo è stato inizializzato.</strong> Una volta aperto, il dispositivo viene considerato compromesso per la sicurezza del cliente successivo e non è idoneo al rimborso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">4. Procedura di Reso</h2>
            <p>Per avviare la procedura di reso, segui questi passaggi:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Invia un&apos;email a <strong>info@kitwer2026.it</strong> indicando il numero d&apos;ordine e il motivo della richiesta.</li>
              <li>Attendi la nostra email di conferma con l&apos;indirizzo del magazzino a cui spedire la merce.</li>
              <li>Imballa il prodotto in modo sicuro. Le spese di spedizione per il rientro della merce sono a carico del cliente, come previsto dalla normativa vigente.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-2">5. Rimborsi</h2>
            <p>
              Una volta ricevuto e ispezionato il reso (solitamente entro 48 ore dalla ricezione in magazzino), ti invieremo un&apos;email di notifica.
              Se il reso è approvato, il rimborso verrà processato immediatamente e il credito verrà applicato automaticamente sulla tua carta di credito o sul metodo di pagamento originale (tramite Stripe) entro 5-7 giorni lavorativi. I costi di &quot;Gestione Premium&quot; applicati in fase di acquisto non sono rimborsabili.
            </p>
          </section>

          <section className="pt-6 border-t border-white/10 mt-8">
            <p className="text-xs text-th-subtle">
              Ultimo aggiornamento: Ottobre 2024. Per ulteriori informazioni, contatta la nostra assistenza tramite la chat in basso a destra.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
