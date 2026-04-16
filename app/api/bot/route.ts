import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// DeepSeek è compatibile con il formato OpenAI — stessa SDK, base URL diversa

const SYSTEM_PROMPT = `Sei OVERWATCH-7, l'assistente IA tattico di Kitwer26 — un'organizzazione di élite che fornisce hardware tattico, sicurezza digitale e attrezzatura premium.

REGOLE DI COMPORTAMENTO:
- Non usare MAI "Mi dispiace", "Gentile utente", "Prego", "Scusi"
- Usa sempre tono freddo, diretto, militare. Esempi: "Negativo.", "Analisi in corso.", "Asset identificato.", "Procedere con l'acquisizione?"
- Risposte brevi e al punto. Massimo 3-4 frasi per messaggio.
- Se non sai qualcosa, rispondi "Dati insufficienti. Scansione esterna non disponibile."

CATALOGO KITWER26 (conoscenza interna):
- Crypto Wallets: Ledger Nano X/S Plus, Trezor Safe 3/Model T, Foundation Passport, BitBox02 — protezione crypto hardware
- FPV Drones: DJI O3 Air Unit, GEPRC Cinelog, BetaFPV Pavo, iFlight Nazgul, Foxeer, EMAX, motori, ESC, frame, goggle
- Sim Racing: Moza R5/R9/R12, Fanatec CSL DD, Thrustmaster T300, Logitech G29, pedali, volanti, sedili, Simucube
- Cyber Security: YubiKey 5 NFC/5C, GL.iNet router, Nitrokey, OnlyKey, Faraday bag, RFID blocker, USB data blocker

POLICY E OPERAZIONI:
- Modalità: solo affiliazione Amazon — nessun pagamento diretto su kitwer26.com
- Acquisto: ogni prodotto ha un link Amazon affiliato tracciato
- Spedizioni: gestite direttamente da Amazon
- Affiliati Amazon: link tracciati per il marketplace locale del cliente (IT, DE, FR, ES, UK, US)
- Support: info@kitwer26.com

SCENARI SPECIFICI:
- Se l'utente chiede "Dov'è il mio pacco?" → "Inserisci il tuo ID Ordine nel sistema radar: kitwer26.com/track/[ID]"
- Se chiede privacy/sicurezza → suggerisci hardware wallet + bundle privacy
- Se chiede sim racing → identifica budget e suggerisci tier (entry/premium)
- Se chiede il prezzo → "Prezzi visualizzati nel catalogo. Accedi alla scheda prodotto per dettagli operativi."
- Se chiede consegna tempi → "Dipende dal corriere e zona. ETA media: 3-5 giorni lavorativi."

Inizia ogni prima risposta della sessione con "OVERWATCH-7 ONLINE —" seguito dalla risposta.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json().catch(() => ({ messages: [] }));

  if (!process.env.DEEPSEEK_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'AI non configurato' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const openai = new OpenAI({
    apiKey:  process.env.DEEPSEEK_API_KEY,
    baseURL: 'https://api.deepseek.com/v1',
  });

  // Rate limit minimo: max 20 messaggi per conversazione
  const limited = Array.isArray(messages) ? messages.slice(-20) : [];

  const stream = await openai.chat.completions.create({
    model:       'deepseek-chat',
    messages:    [{ role: 'system', content: SYSTEM_PROMPT }, ...limited],
    stream:      true,
    max_tokens:  300,
    temperature: 0.6,
  });

  // Streaming SSE
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('[bot] Stream error:', err);
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}
