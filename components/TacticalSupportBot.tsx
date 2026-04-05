'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// ── Tipi ──────────────────────────────────────────────────────────────────────

type Screen = 'closed' | 'boot' | 'menu' | 'answer';

interface MenuItem {
  id:      string;
  label:   string;
  icon:    string;
  answer:  string;
  link?:   { href: string; text: string };
}

const MENU_ITEMS: MenuItem[] = [
  {
    id:     'tracking',
    icon:   '🛰️',
    label:  'MONITORAGGIO ASSET',
    answer: 'Protocollo Amazon attivo. Usa il link inviato via email per il monitoraggio in tempo reale sui server del fornitore. In alternativa, accedi al portale radar con il tuo ID Ordine.',
  },
  {
    id:     'anomaly',
    icon:   '⚠️',
    label:  'SEGNALA ANOMALIA',
    answer: 'PROTOCOLLO DI ASSISTENZA ATTIVATO. Rilevata discrepanza nel segnale. Per segnalare malfunzionamenti o errori, trasmetti un dispaccio criptato includendo ID ORDINE per priorità massima.',
    link:   { href: 'mailto:kitwer26@zoho.eu', text: '[ APRI CANALE MAIL ]' },
  },
  {
    id:     'support',
    icon:   '🛠️',
    label:  'SUPPORTO TECNICO',
    answer: 'Protocollo manutenzione attivo. Consulta il manuale digitale allegato al tuo ordine o invia una richiesta per specifiche tecniche avanzate a kitwer26@zoho.eu.',
  },
];

const BOOT_SEQUENCE = [
  '[ IDENTIFICAZIONE... OK ]',
  '[ CONNESSIONE SERVER KITWER... STABILITA ]',
];

// Typing effect hook
function useTyping(text: string, active: boolean, speed = 18) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    if (!active) { setDisplayed(''); return; }
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, active, speed]);

  return displayed;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function TacticalSupportBot() {
  const [screen,     setScreen]     = useState<Screen>('closed');
  const [bootIdx,    setBootIdx]    = useState(0);
  const [bootDone,   setBootDone]   = useState(false);
  const [selected,   setSelected]   = useState<MenuItem | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const answerText = useTyping(selected?.answer ?? '', showAnswer);

  // Boot sequence
  useEffect(() => {
    if (screen !== 'boot') return;
    setBootIdx(0);
    setBootDone(false);

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setBootIdx(i);
      if (i >= BOOT_SEQUENCE.length) {
        clearInterval(interval);
        setTimeout(() => { setBootDone(true); setScreen('menu'); }, 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [screen]);

  function open() {
    setSelected(null);
    setShowAnswer(false);
    setScreen('boot');
  }

  function close() {
    setScreen('closed');
    setSelected(null);
    setShowAnswer(false);
  }

  function selectItem(item: MenuItem) {
    setSelected(item);
    setShowAnswer(false);
    setScreen('answer');
    setTimeout(() => setShowAnswer(true), 100);
  }

  function backToMenu() {
    setSelected(null);
    setShowAnswer(false);
    setScreen('menu');
  }

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={screen === 'closed' ? open : close}
        aria-label="OVERWATCH Support"
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="relative">
          {screen === 'closed' && (
            <span className="absolute inset-0 rounded-full animate-ping" style={{ backgroundColor: '#22d3ee20' }} />
          )}
          <div
            className="relative h-14 w-14 flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              backgroundColor: '#050505',
              border: '1px solid #22d3ee44',
              boxShadow: '0 0 20px rgba(34,211,238,0.3)',
            }}
          >
            <Image
              src="/svg_kitwer/freepik__svg-chatbot-clean-vector-lines-friendly-rounded-sp__59074-removebg-preview.png"
              alt="Support"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
        </div>
      </button>

      {/* Terminal window */}
      {screen !== 'closed' && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-[340px] flex flex-col rounded-sm overflow-hidden font-mono"
          style={{
            background:  '#050505',
            border:      '1px solid #22d3ee33',
            maxHeight:   '480px',
            boxShadow:   '0 0 40px rgba(34,211,238,0.08)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid #22d3ee22', background: '#0a0a0a' }}
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] tracking-[0.2em] text-cyan-400 uppercase font-bold">
                KITWER SUPPORT
              </span>
            </div>
            <button
              onClick={close}
              className="text-sm font-bold px-1 transition-colors"
              style={{ color: '#ff9a3e' }}
            >
              X
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Boot */}
            {(screen === 'boot' || bootIdx > 0) && (
              <div className="space-y-1">
                {BOOT_SEQUENCE.slice(0, bootIdx).map((line, i) => (
                  <p key={i} className="text-[11px]" style={{ color: '#22d3ee' }}>{line}</p>
                ))}
              </div>
            )}

            {/* Menu */}
            {screen === 'menu' && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: '#a1a1aa', lineHeight: 1.6 }}>
                  Operatore, i sistemi di supporto sono attivi. Seleziona il settore d&apos;intervento per assistenza immediata.
                </p>
                <div className="space-y-2">
                  {MENU_ITEMS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => selectItem(item)}
                      className="w-full text-left px-3 py-2.5 rounded-sm text-[11px] font-bold tracking-widest uppercase transition-all"
                      style={{
                        border:     '1px solid #22d3ee22',
                        background: '#0a0a0a',
                        color:      '#22d3ee',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#22d3ee10')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#0a0a0a')}
                    >
                      {item.icon} {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Answer */}
            {screen === 'answer' && selected && (
              <div className="space-y-3">
                <p className="text-[10px] tracking-widest" style={{ color: '#ff9a3e' }}>
                  &gt; {selected.icon} {selected.label}
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: '#a1a1aa' }}>
                  {answerText}
                  {answerText.length < (selected.answer.length) && (
                    <span className="animate-pulse" style={{ color: '#22d3ee' }}>█</span>
                  )}
                </p>

                {/* Link action se presente */}
                {selected.link && showAnswer && answerText === selected.answer && (
                  <a
                    href={selected.link.href}
                    className="inline-block px-4 py-2 text-[10px] font-bold tracking-widest uppercase rounded-sm transition-all"
                    style={{ border: '1px solid #22d3ee40', color: '#22d3ee', background: '#0a0a0a' }}
                  >
                    {selected.link.text}
                  </a>
                )}

                <button
                  onClick={backToMenu}
                  className="text-[10px] tracking-widest transition-colors"
                  style={{ color: '#52525b' }}
                >
                  ← torna al menu
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-2"
            style={{ borderTop: '1px solid #0f0f0f' }}
          >
            <p className="text-[9px] tracking-wider" style={{ color: '#27272a' }}>
              Uplink criptato attivo via Zoho Secure Mail
            </p>
          </div>
        </div>
      )}
    </>
  );
}
