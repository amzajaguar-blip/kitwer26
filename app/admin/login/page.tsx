'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// ── Tactical HUD — Error types ────────────────────────────────────────────────

type ErrorCode = 'unauthorized' | 'session_expired' | 'config_error' | 'missing_secret' | 'middleware_crash';

const HUD_CONFIG: Record<ErrorCode, {
  label:   string;
  message: string;
  icon:    string;
  accent:  string;
  glow:    string;
}> = {
  unauthorized: {
    label:   'AVVISO',
    message: 'Accesso Negato. Credenziali non valide.',
    icon:    '⬡',
    accent:  '#ff9a3e',
    glow:    'rgba(255,154,62,0.25)',
  },
  session_expired: {
    label:   'SESSIONE SCADUTA',
    message: 'Effettuare nuovamente il login.',
    icon:    '◈',
    accent:  '#f59e0b',
    glow:    'rgba(245,158,11,0.22)',
  },
  config_error: {
    label:   'ERRORE CRITICO',
    message: 'Configurazione Server incompleta. Contattare il CISO.',
    icon:    '⚠',
    accent:  '#ef4444',
    glow:    'rgba(239,68,68,0.28)',
  },
  missing_secret: {
    label:   'VARIABILE MANCANTE',
    message: 'ADMIN_API_SECRET non configurato su Vercel. Aggiungila in Settings → Environment Variables.',
    icon:    '⚠',
    accent:  '#ef4444',
    glow:    'rgba(239,68,68,0.28)',
  },
  middleware_crash: {
    label:   'ERRORE GATEWAY',
    message: 'Il sistema di accesso ha rilevato un\'eccezione. Riprovare o contattare il supporto.',
    icon:    '⬡',
    accent:  '#ef4444',
    glow:    'rgba(239,68,68,0.28)',
  },
};

// ── Tactical HUD Component ────────────────────────────────────────────────────

function TacticalHUD({ code, onDismiss }: { code: ErrorCode; onDismiss: () => void }) {
  const cfg = HUD_CONFIG[code];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        width:        '100%',
        maxWidth:     '384px',
        marginBottom: '16px',
        background:   '#0a0a0a',
        border:       `1px solid ${cfg.accent}`,
        borderRadius: '2px',
        boxShadow:    `0 0 18px ${cfg.glow}, inset 0 0 10px rgba(0,0,0,0.8)`,
        fontFamily:   'monospace',
        opacity:      visible ? 1 : 0,
        transform:    visible ? 'translateY(0)' : 'translateY(-6px)',
        transition:   'opacity 220ms ease, transform 220ms ease',
        overflow:     'hidden',
      }}
    >
      {/* Scan-line top accent */}
      <div style={{
        height:     '2px',
        background: `linear-gradient(90deg, transparent, ${cfg.accent}, transparent)`,
        animation:  'hud-scan 2.4s ease-in-out infinite',
      }} />

      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{
          fontSize:   '16px',
          color:      cfg.accent,
          flexShrink: 0,
          marginTop:  '1px',
          animation:  'hud-pulse 1.8s ease-in-out infinite',
          filter:     `drop-shadow(0 0 4px ${cfg.accent})`,
        }}>
          {cfg.icon}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize:      '9px',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color:         cfg.accent,
            fontWeight:    700,
            marginBottom:  '4px',
            lineHeight:    '1',
          }}>
            {cfg.label}
          </p>
          <p style={{ fontSize: '11px', color: '#d4d4d4', lineHeight: '1.5' }}>
            {'[ '}{cfg.message}{' ]'}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Chiudi"
          style={{
            flexShrink: 0,
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      '#52525b',
            fontSize:   '14px',
            lineHeight: '1',
            padding:    '2px',
            fontFamily: 'monospace',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = cfg.accent)}
          onMouseLeave={e => (e.currentTarget.style.color = '#52525b')}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Stili statici — definiti fuori dal componente per evitare new reference ad ogni render

const inputStyle: React.CSSProperties = {
  width:        '100%',
  background:   '#111',
  border:       '1px solid #2a2a2a',
  borderRadius: '2px',
  padding:      '10px 14px',
  fontSize:     '13px',
  color:        '#e4e4e7',
  fontFamily:   'monospace',
  outline:      'none',
  boxSizing:    'border-box',
  transition:   'border-color 150ms',
};

const labelStyle: React.CSSProperties = {
  display:       'block',
  fontFamily:    'monospace',
  fontSize:      '9px',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color:         '#52525b',
  marginBottom:  '6px',
};

// ── Login Form ─────────────────────────────────────────────────────────────────

function LoginForm() {
  const searchParams = useSearchParams();
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [token,     setToken]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [formError, setFormError] = useState('');
  const [hudCode,   setHudCode]   = useState<ErrorCode | null>(null);

  useEffect(() => {
    const err = searchParams.get('error');
    const valid: ErrorCode[] = ['unauthorized', 'session_expired', 'config_error', 'missing_secret', 'middleware_crash'];
    if (err && valid.includes(err as ErrorCode)) {
      setHudCode(err as ErrorCode);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setHudCode(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/vault', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, token }),
      });

      if (res.ok) {
        window.location.href = '/admin/logistics';
      } else if (res.status === 500) {
        setHudCode('config_error');
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || 'Credenziali non valide');
      }
    } catch {
      setFormError('Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div style={{ width: '100%', maxWidth: '384px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#3f3f46' }}>
            KITWER26 // SECURE ACCESS TERMINAL
          </p>
        </div>

        {/* Tactical HUD */}
        {hudCode && (
          <TacticalHUD code={hudCode} onDismiss={() => setHudCode(null)} />
        )}

        {/* Login Card */}
        <div style={{ background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: '2px', padding: '32px' }}>
          <h1 style={{
            fontFamily:    'monospace',
            fontSize:      '12px',
            fontWeight:    700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color:         '#e4e4e7',
            marginBottom:  '24px',
          }}>
            &gt; AUTENTICAZIONE OPERATORE
          </h1>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div>
              <label style={labelStyle}>ID Operatore</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="admin@kitwer26.com"
                required
                style={inputStyle}
                onFocus={e  => (e.target.style.borderColor = '#ff9a3e')}
                onBlur={e   => (e.target.style.borderColor = '#2a2a2a')}
              />
            </div>

            <div>
              <label style={labelStyle}>Chiave di Accesso</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={e  => (e.target.style.borderColor = '#ff9a3e')}
                onBlur={e   => (e.target.style.borderColor = '#2a2a2a')}
              />
            </div>

            <div>
              <label style={labelStyle}>Token Operativo</label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                autoComplete="off"
                placeholder="••••••••••••"
                required
                style={inputStyle}
                onFocus={e  => (e.target.style.borderColor = '#ff9a3e')}
                onBlur={e   => (e.target.style.borderColor = '#2a2a2a')}
              />
            </div>

            {/* Inline form error */}
            {formError && (
              <div style={{
                display:      'flex',
                alignItems:   'flex-start',
                gap:          '8px',
                padding:      '10px 12px',
                background:   '#1a0000',
                border:       '1px solid #7f1d1d',
                borderRadius: '2px',
                fontFamily:   'monospace',
                fontSize:     '11px',
                color:        '#fca5a5',
              }}>
                <span style={{ flexShrink: 0 }}>⬡</span>
                <span>{'[ '}{formError}{' ]'}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:         '100%',
                background:    loading ? '#1c1c1c' : '#ff9a3e',
                border:        'none',
                borderRadius:  '2px',
                padding:       '11px',
                fontFamily:    'monospace',
                fontSize:      '10px',
                fontWeight:    700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color:         loading ? '#52525b' : '#0a0a0a',
                cursor:        loading ? 'not-allowed' : 'pointer',
                marginTop:     '4px',
                transition:    'box-shadow 150ms',
                boxShadow:     loading ? 'none' : '0 0 14px rgba(255,154,62,0.35)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 22px rgba(255,154,62,0.6)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.boxShadow = '0 0 14px rgba(255,154,62,0.35)'; }}
            >
              {loading ? '[ VERIFICA IN CORSO... ]' : '[ AVVIA PROTOCOLLO DI ACCESSO ]'}
            </button>

          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign:     'center',
          marginTop:     '20px',
          fontFamily:    'monospace',
          fontSize:      '9px',
          letterSpacing: '0.15em',
          color:         '#27272a',
        }}>
          KITWER26 SECURE TERMINAL v2 // ACCESSO MONITORATO
        </p>

      </div>
    </div>
  );
}

// ── Page export ───────────────────────────────────────────────────────────────

export default function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
