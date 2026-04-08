import {
  Html, Head, Preview, Body, Container,
  Section, Row, Column, Text, Button, Hr, Font,
} from '@react-email/components';

// ── Status config ────────────────────────────────────────────────────────────

interface StatusConfig {
  emoji: string;
  subject: string;
  headline: string;
  message: string;
  color: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  shipped: {
    emoji: '🚀',
    subject: 'Il tuo ordine e\' stato spedito!',
    headline: 'ASSET IN MOVIMENTO',
    message: 'Il tuo ordine e\' stato affidato al corriere ed e\' in viaggio verso di te.',
    color: '#22d3ee',
  },
  in_transit: {
    emoji: '📦',
    subject: 'Il tuo ordine e\' in transito',
    headline: 'IN TRANSITO',
    message: 'Il pacco e\' attualmente in transito nella rete di distribuzione. Arrivera\' presto!',
    color: '#3b82f6',
  },
  out_for_delivery: {
    emoji: '🛵',
    subject: 'In consegna oggi!',
    headline: 'IN CONSEGNA',
    message: 'Il corriere e\' in arrivo! Il tuo ordine verra\' consegnato oggi.',
    color: '#f59e0b',
  },
  delivered: {
    emoji: '✅',
    subject: 'Ordine consegnato!',
    headline: 'CONSEGNATO',
    message: 'Il tuo ordine e\' stato consegnato con successo. Buon divertimento!',
    color: '#22c55e',
  },
  delayed: {
    emoji: '⚠️',
    subject: 'Ritardo nella consegna',
    headline: 'RITARDO SEGNALATO',
    message: 'Abbiamo rilevato un ritardo nella consegna del tuo ordine. Stiamo monitorando la situazione.',
    color: '#ef4444',
  },
};

// ── Props ────────────────────────────────────────────────────────────────────

export interface TrackingUpdateProps {
  orderId: string;
  customerName: string;
  status: string;
  trackingNumber?: string;
  carrierCode?: string;
  crossSellProducts?: { name: string; price: number; url: string }[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function TrackingUpdate({
  orderId,
  customerName,
  status,
  trackingNumber,
  carrierCode,
  crossSellProducts,
}: TrackingUpdateProps) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.shipped;
  const shortId = orderId.slice(0, 8).toUpperCase();
  const trackUrl = `https://kitwer26.com/track/${orderId}`;

  return (
    <Html lang="it">
      <Head>
        <Font
          fontFamily="JetBrains Mono"
          fallbackFontFamily="monospace"
          webFont={{
            url: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4xD-IQ.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>
        {cfg.emoji} {cfg.subject} — Ordine #{shortId}
      </Preview>

      <Body style={{ backgroundColor: '#09090b', margin: 0, padding: 0 }}>
        <Container
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            padding: '32px 16px',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          {/* Top status bar */}
          <Section style={{ marginBottom: '24px' }}>
            <Row>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontSize: '10px',
                    letterSpacing: '0.25em',
                    color: '#22d3ee',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  ● KITWER OVERWATCH — AGGIORNAMENTO SPEDIZIONE
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Main card */}
          <Section
            style={{
              background: '#111111',
              border: '1px solid #1e293b',
              borderRadius: '6px',
              padding: '28px 24px',
              marginBottom: '16px',
            }}
          >
            {/* Status headline */}
            <Text
              style={{
                margin: '0 0 4px',
                fontSize: '22px',
                fontWeight: 800,
                color: cfg.color,
                letterSpacing: '-0.02em',
              }}
            >
              {cfg.emoji} {cfg.headline}
            </Text>
            <Text
              style={{
                margin: '0 0 20px',
                fontSize: '12px',
                color: '#52525b',
                letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
              }}
            >
              Ordine #{shortId}
            </Text>

            <Hr style={{ borderColor: '#1e293b', marginBottom: '20px' }} />

            {/* Greeting */}
            <Text style={{ margin: '0 0 16px', fontSize: '14px', color: '#d4d4d8' }}>
              Ciao <strong style={{ color: '#ffffff' }}>{customerName}</strong>,
            </Text>
            <Text
              style={{
                margin: '0 0 20px',
                fontSize: '13px',
                color: '#a1a1aa',
                lineHeight: '1.6',
              }}
            >
              {cfg.message}
            </Text>

            {/* Tracking info */}
            {trackingNumber && (
              <Section
                style={{
                  background: '#0a0a0a',
                  border: `1px solid ${cfg.color}22`,
                  borderRadius: '4px',
                  padding: '16px',
                  marginBottom: '24px',
                }}
              >
                <Text
                  style={{
                    margin: '0 0 8px',
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    color: '#52525b',
                    textTransform: 'uppercase' as const,
                  }}
                >
                  &gt; DATI SPEDIZIONE
                </Text>
                <Text style={{ margin: '0 0 4px', fontSize: '12px', color: '#a1a1aa' }}>
                  Tracking:{' '}
                  <strong style={{ color: cfg.color, fontFamily: 'monospace' }}>
                    {trackingNumber}
                  </strong>
                </Text>
                {carrierCode && (
                  <Text style={{ margin: '0 0 4px', fontSize: '12px', color: '#a1a1aa' }}>
                    Corriere: <strong style={{ color: '#ffffff' }}>{carrierCode}</strong>
                  </Text>
                )}
              </Section>
            )}

            {/* CTA */}
            <Section style={{ textAlign: 'center' as const }}>
              <Button
                href={trackUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: cfg.color,
                  color: '#000000',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase' as const,
                  padding: '14px 32px',
                  borderRadius: '3px',
                  textDecoration: 'none',
                }}
              >
                [ TRACCIA ORDINE ]
              </Button>
            </Section>
          </Section>

          {/* Cross-sell section */}
          {crossSellProducts && crossSellProducts.length > 0 && (
            <Section
              style={{
                background: '#111111',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '20px 24px',
                marginBottom: '16px',
              }}
            >
              <Text
                style={{
                  margin: '0 0 16px',
                  fontSize: '11px',
                  letterSpacing: '0.15em',
                  color: '#52525b',
                  textTransform: 'uppercase' as const,
                }}
              >
                &gt; POTREBBE INTERESSARTI
              </Text>
              {crossSellProducts.map((product, i) => (
                <Section key={i} style={{ marginBottom: i < crossSellProducts.length - 1 ? '12px' : '0' }}>
                  <Row>
                    <Column>
                      <Text style={{ margin: '0 0 2px', fontSize: '13px', color: '#d4d4d8' }}>
                        <a
                          href={product.url}
                          style={{ color: '#d4d4d8', textDecoration: 'none' }}
                        >
                          {product.name}
                        </a>
                      </Text>
                      <Text style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#ff9a3e' }}>
                        {product.price.toFixed(2).replace('.', ',')} &euro;
                      </Text>
                    </Column>
                  </Row>
                </Section>
              ))}
            </Section>
          )}

          {/* Footer */}
          <Section>
            <Text
              style={{
                margin: 0,
                fontSize: '10px',
                color: '#27272a',
                textAlign: 'center' as const,
                letterSpacing: '0.1em',
              }}
            >
              KITWER26 &copy; 2026 &mdash; SISTEMA CLASSIFICATO
            </Text>
            <Text
              style={{
                margin: '4px 0 0',
                fontSize: '10px',
                color: '#27272a',
                textAlign: 'center' as const,
              }}
            >
              Ordine: {orderId}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default TrackingUpdate;
