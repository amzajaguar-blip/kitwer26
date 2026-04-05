import {
  Html, Head, Preview, Body, Container,
  Section, Text, Button, Hr, Font,
} from '@react-email/components';

export interface MissionDebriefingProps {
  orderId:      string;
  customerName: string;
  reviewUrl?:   string;
}

export function MissionDebriefing({ orderId, customerName, reviewUrl }: MissionDebriefingProps) {
  const shortId  = orderId.slice(0, 8).toUpperCase();
  const trackUrl = `https://kitwer26.com/track/${orderId}`;

  return (
    <Html lang="it">
      <Head>
        <Font
          fontFamily="JetBrains Mono"
          fallbackFontFamily="monospace"
          webFont={{ url: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4xD-IQ.woff2', format: 'woff2' }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>📋 Debriefing Missione #{shortId} — Conferma ricezione asset richiesta</Preview>

      <Body style={{ backgroundColor: '#09090b', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 16px', fontFamily: '"JetBrains Mono", monospace' }}>

          {/* Status bar */}
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ margin: 0, fontSize: '10px', letterSpacing: '0.25em', color: '#22c55e', textTransform: 'uppercase' }}>
              ✓ KITWER OVERWATCH — MISSIONE COMPLETATA
            </Text>
          </Section>

          {/* Card */}
          <Section style={{ background: '#111111', border: '1px solid #14532d', borderRadius: '6px', padding: '28px 24px' }}>

            <Text style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#22c55e' }}>
              📋 DEBRIEFING MISSIONE
            </Text>
            <Text style={{ margin: '0 0 20px', fontSize: '11px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Rapporto post-operazione — Asset #{shortId}
            </Text>

            <Hr style={{ borderColor: '#1e293b', marginBottom: '20px' }} />

            <Text style={{ margin: '0 0 14px', fontSize: '13px', color: '#d4d4d8' }}>
              Operatore <strong style={{ color: '#ffffff' }}>{customerName}</strong>,
            </Text>

            <Text style={{ margin: '0 0 14px', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.7' }}>
              I sistemi di Kitwer26 registrano che l&apos;asset{' '}
              <span style={{ color: '#22c55e', fontWeight: 700 }}>#{shortId}</span>{' '}
              è stato consegnato con successo.
            </Text>

            <Text style={{ margin: '0 0 20px', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.7' }}>
              Richiediamo un <strong style={{ color: '#ffffff' }}>rapporto di valutazione tecnica</strong> del servizio ricevuto.
              Il tuo feedback è un dato operativo critico per il comando.
            </Text>

            {/* Rating request */}
            <Section style={{ background: '#0a0a0a', border: '1px solid #22d3ee22', borderRadius: '4px', padding: '14px 16px', marginBottom: '24px' }}>
              <Text style={{ margin: '0 0 4px', fontSize: '10px', color: '#52525b', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                &gt; VALUTAZIONE OPERATIVA
              </Text>
              <Text style={{ margin: 0, fontSize: '12px', color: '#a1a1aa', lineHeight: '1.6' }}>
                Se l&apos;operazione è andata a buon fine, il comando ti invita a lasciare una valutazione ufficiale.
                Ogni recensione rafforza la rete tattica di Kitwer26.
              </Text>
            </Section>

            {/* CTA principale */}
            {reviewUrl && (
              <Section style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Button
                  href={reviewUrl}
                  style={{
                    display:         'inline-block',
                    backgroundColor: '#22d3ee',
                    color:           '#000000',
                    fontFamily:      '"JetBrains Mono", monospace',
                    fontSize:        '12px',
                    fontWeight:      800,
                    letterSpacing:   '0.12em',
                    textTransform:   'uppercase',
                    padding:         '14px 28px',
                    borderRadius:    '3px',
                    textDecoration:  'none',
                  }}
                >
                  [ TRASMETTI VALUTAZIONE ]
                </Button>
              </Section>
            )}

            {/* Secondary link */}
            <Text style={{ margin: '8px 0 0', textAlign: 'center', fontSize: '11px', color: '#3f3f46' }}>
              Storico missione:{' '}
              <a href={trackUrl} style={{ color: '#52525b' }}>
                kitwer26.com/track/{orderId.slice(0, 8)}
              </a>
            </Text>
          </Section>

          <Section style={{ marginTop: '24px', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontSize: '10px', color: '#27272a', letterSpacing: '0.1em' }}>
              KITWER26 © 2026 — OPERAZIONE ARCHIVIATA
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default MissionDebriefing;
