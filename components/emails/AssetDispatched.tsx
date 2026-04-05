import {
  Html, Head, Preview, Body, Container,
  Section, Row, Column, Text, Button, Hr, Font,
} from '@react-email/components';

export interface AssetDispatchedProps {
  orderId:        string;
  customerEmail?: string;
  customerName:   string;
  trackingNumber: string;
  carrierUrl?:    string;
  carrier?:       string;
  estimatedDays?: number;
}

export function AssetDispatched({
  orderId,
  customerName,
  trackingNumber,
  carrierUrl,
  carrier,
  estimatedDays,
}: AssetDispatchedProps) {
  const shortId   = orderId.slice(0, 8).toUpperCase();
  const trackUrl  = `https://kitwer26.com/track/${orderId}`;
  const etaText   = estimatedDays
    ? `ETA stimata: ${estimatedDays} giorni lavorativi`
    : 'Aggiornamenti in tempo reale sul portale radar.';

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
      <Preview>🛰️ Asset #{shortId} in movimento — Attiva il monitoraggio radar</Preview>

      <Body style={{ backgroundColor: '#09090b', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 16px', fontFamily: '"JetBrains Mono", monospace' }}>

          {/* ── Top status bar ─────────────────────────────────────────── */}
          <Section style={{ marginBottom: '24px' }}>
            <Row>
              <Column>
                <Text style={{ margin: 0, fontSize: '10px', letterSpacing: '0.25em', color: '#22d3ee', textTransform: 'uppercase' }}>
                  ● KITWER OVERWATCH — LOGISTICA ATTIVA
                </Text>
              </Column>
            </Row>
          </Section>

          {/* ── Main card ──────────────────────────────────────────────── */}
          <Section style={{ background: '#111111', border: '1px solid #1e293b', borderRadius: '6px', padding: '28px 24px', marginBottom: '16px' }}>

            {/* Title */}
            <Text style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#22d3ee', letterSpacing: '-0.02em' }}>
              🛰️ ASSET IN MOVIMENTO
            </Text>
            <Text style={{ margin: '0 0 20px', fontSize: '12px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Spedizione confermata — Protocollo logistica avviato
            </Text>

            <Hr style={{ borderColor: '#1e293b', marginBottom: '20px' }} />

            {/* Greeting */}
            <Text style={{ margin: '0 0 16px', fontSize: '14px', color: '#d4d4d8' }}>
              Operatore <strong style={{ color: '#ffffff' }}>{customerName}</strong>,
            </Text>
            <Text style={{ margin: '0 0 20px', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.6' }}>
              L&apos;asset relativo all&apos;ordine <span style={{ color: '#22d3ee', fontWeight: 700 }}>#{shortId}</span> è stato
              dispacciato e risulta attualmente in transito nella rete di distribuzione.
            </Text>

            {/* Tracking info block */}
            <Section style={{ background: '#0a0a0a', border: '1px solid #22d3ee22', borderRadius: '4px', padding: '16px', marginBottom: '24px' }}>
              <Text style={{ margin: '0 0 8px', fontSize: '10px', letterSpacing: '0.2em', color: '#52525b', textTransform: 'uppercase' }}>
                &gt; DATI RADAR
              </Text>
              <Text style={{ margin: '0 0 4px', fontSize: '12px', color: '#a1a1aa' }}>
                Tracking: <strong style={{ color: '#22d3ee', fontFamily: 'monospace' }}>{trackingNumber}</strong>
              </Text>
              {carrier && (
                <Text style={{ margin: '0 0 4px', fontSize: '12px', color: '#a1a1aa' }}>
                  Corriere: <strong style={{ color: '#ffffff' }}>{carrier}</strong>
                </Text>
              )}
              <Text style={{ margin: '0', fontSize: '11px', color: '#52525b', marginTop: '8px' }}>
                {etaText}
              </Text>
            </Section>

            {/* CTA */}
            <Section style={{ textAlign: 'center' }}>
              <Button
                href={trackUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#22d3ee',
                  color: '#000000',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '14px 32px',
                  borderRadius: '3px',
                  textDecoration: 'none',
                }}
              >
                [ ATTIVA MONITORAGGIO RADAR ]
              </Button>
            </Section>

            {carrierUrl && (
              <Text style={{ margin: '16px 0 0', textAlign: 'center', fontSize: '11px', color: '#3f3f46' }}>
                Tracking diretto corriere:{' '}
                <a href={carrierUrl} style={{ color: '#52525b', textDecoration: 'underline' }}>
                  {carrierUrl}
                </a>
              </Text>
            )}
          </Section>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <Section>
            <Text style={{ margin: 0, fontSize: '10px', color: '#27272a', textAlign: 'center', letterSpacing: '0.1em' }}>
              KITWER26 © 2026 — SISTEMA CLASSIFICATO
            </Text>
            <Text style={{ margin: '4px 0 0', fontSize: '10px', color: '#27272a', textAlign: 'center' }}>
              Ordine: {orderId}
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default AssetDispatched;
