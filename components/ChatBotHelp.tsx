'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import Image from 'next/image';

type Message = {
  from: 'bot' | 'user';
  text: string;
};

const FAQ: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['spedizione', 'consegna', 'spedire', 'arriva', 'quanto ci vuole', 'tempi'],
    answer:
      'Le spedizioni vengono elaborate entro 1-2 giorni lavorativi. I tempi di consegna dipendono dal corriere, solitamente 2-4 giorni lavorativi in Italia.',
  },
  {
    keywords: ['reso', 'rimborso', 'restituire', 'restituzione', 'cambio'],
    answer:
      'Puoi richiedere un reso entro 14 giorni dalla ricezione del prodotto. Il prodotto deve essere integro e nella confezione originale. Visita la pagina Reso per maggiori dettagli.',
  },
  {
    keywords: ['pagamento', 'pagare', 'carta', 'paypal', 'metodo'],
    answer:
      'Accettiamo pagamenti tramite carta di credito/debito, PayPal e altri metodi sicuri gestiti da Stripe.',
  },
  {
    keywords: ['ordine', 'tracciare', 'tracking', 'dove', 'stato ordine'],
    answer:
      'Riceverai una email di conferma con il numero di tracciamento non appena il tuo ordine verrà spedito.',
  },
  {
    keywords: ['prodotto', 'disponibile', 'stock', 'esaurito', 'disponibilità'],
    answer:
      'La disponibilità è indicata su ogni scheda prodotto. Se un articolo risulta esaurito, puoi contattarci per sapere quando tornerà disponibile.',
  },
  {
    keywords: ['contatto', 'contattare', 'email', 'scrivere', 'assistenza'],
    answer:
      'Per assistenza diretta puoi scriverci all\'indirizzo support@kitwer26.com. Rispondiamo di solito entro 24 ore nei giorni lavorativi.',
  },
  {
    keywords: ['garanzia', 'difetto', 'rotto', 'danneggiato'],
    answer:
      'Tutti i prodotti sono coperti da garanzia legale di 2 anni. In caso di prodotto difettoso, contattaci subito e troveremo una soluzione.',
  },
  {
    keywords: ['sconto', 'coupon', 'codice', 'offerta', 'promo'],
    answer:
      'Tieni d\'occhio le nostre promozioni! Puoi inserire il codice sconto direttamente nel carrello prima di procedere al pagamento.',
  },
];

const WELCOME =
  'Ciao! Sono l\'assistente di Kitwer. Come posso aiutarti? Puoi chiedermi informazioni su spedizioni, resi, pagamenti, ordini e molto altro.';

function getBotReply(input: string): string {
  const lower = input.toLowerCase();
  for (const entry of FAQ) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.answer;
    }
  }
  return 'Non ho trovato una risposta alla tua domanda. Per assistenza specifica puoi scriverci a support@kitwer26.com — rispondiamo entro 24h.';
}

export function ChatBotHelpFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ from: 'bot', text: WELCOME }]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: Message = { from: 'user', text: trimmed };
    const botMsg: Message = { from: 'bot', text: getBotReply(trimmed) };
    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') sendMessage();
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label="Assistenza"
        className="fixed right-3 bottom-20 md:bottom-6 z-40 flex items-center gap-2 rounded-full
                   bg-blue-600 text-white px-3 py-2 shadow-lg text-xs font-semibold
                   md:text-sm md:px-4 md:py-2.5 active:scale-95 transition-transform md:right-6"
      >
        <Image
          src="/svg_kitwer/chatbot-gold.png"
          alt="Assistenza"
          width={24}
          height={24}
          className="w-6 h-6 object-contain"
        />
      </button>

      {isOpen && (
        <div className="fixed right-3 bottom-36 md:bottom-20 md:right-6 z-50 w-80 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl flex flex-col overflow-hidden"
             style={{ maxHeight: '420px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 bg-zinc-800">
            <span className="font-mono text-sm font-bold text-cyan-400">ASSISTENZA KITWER</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-th-subtle hover:text-white transition-colors"
              aria-label="Chiudi"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs font-mono leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-700 text-white'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2 border-t border-zinc-700 bg-zinc-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Scrivi un messaggio..."
              className="flex-1 bg-zinc-700 text-zinc-100 text-xs font-mono rounded-lg px-3 py-2 outline-none placeholder-zinc-500 focus:ring-1 focus:ring-cyan-500"
            />
            <button
              onClick={sendMessage}
              aria-label="Invia"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors active:scale-95"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
