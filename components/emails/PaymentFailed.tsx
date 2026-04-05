import {
  Html, Head, Preview, Body, Container,
  Section, Text, Button, Hr, Font,
} from '@react-email/components';

export interface PaymentFailedProps {
  orderId:      string;
  customerName: string;
  checkoutUrl:  string;
}

export function PaymentFailed({ orderId, customerName, checkoutUrl }: PaymentFailedProps) {
  const shortId = orderId.slice(0, 8).toUpperCase();

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
      <Preview>⚠️ Interruzione Protocollo — Asset #{shortId} in sospeso. Slot scade tra 24 ore.</Preview>

      <Body style={{ backgroundColor: '#09090b', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 16px', fontFamily: '"JetBrains Mono", monospace' }}>

          {/* Alert bar */}
          <Section style={{ marginBottom: '24px' }}>
            <Text style={{ margin: 0, fontSize: '10px', letterSpacing: '0.25em', color: '#f97316', textTransform: 'uppercase' }}>
              ⚠ KITWER OVERWATCH — ALLERTA PROTOCOLLO
            </Text>
          </Section>

          {/* Card */}
          <Section style={{ background: '#111111', border: '1px solid #7c2d12', borderRadius: '6px', padding: '28px 24px' }}>

            <Text style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#f97316' }}>
              ⚠️ INTERRUZIONE PROTOCOLLO
            </Text>
            <Text style={{ margin: '0 0 20px', fontSize: '11px', color: '#52525b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Anomalia rilevata nella transazione
            </Text>

            <Hr style={{ borderColor: '#1e293b', marginBottom: '20px' }} />

            <Text style={{ margin: '0 0 16px', fontSize: '13px', color: '#d4d4d8' }}>
              Operatore <strong style={{ color: '#ffffff' }}>{customerName}</strong>,
            </Text>

            <Text style={{ margin: '0 0 16px', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.7' }}>
              I nostri sistemi hanno rilevato un&apos;interruzione nella transazione relativa all&apos;asset{' '}
              <span style={{ color: '#f97316', fontWeight: 700 }}>#{shortId}</span>.
            </Text>

            <Text style={{ margin: '0 0 20px', fontSize: '13px', color: '#a1a1aa', lineHeight: '1.7' }}>
              L&apos;asset è rimasto in sospeso nei nostri server protetti.
              Il tuo <strong style={{ color: '#ffffff' }}>slot di acquisizione scadrà tra 24 ore</strong>.
            </Text>

            {/* Alert box */}
            <Section style={{ background: '#1a0a00', border: '1px solid #f9741633', borderRadius: '4px', padding: '12px 16px', marginBottom: '24px' }}>
              <Text style={{ margin: 0, fontSize: '11px', color: '#f97316', letterSpacing: '0.1em' }}>
                &gt; Vulnerabilità rilevata nel processo di transazione.<br />
                &gt; Verifica fondi disponibili o seleziona metodo alternativo.
              </Text>
            </Section>

            {/* CTA */}
            <Section style={{ textAlign: 'center' }}>
              <Button
                href={checkoutUrl}
                style={{
                  display:         'inline-block',
                  backgroundColor: '#ff9a3e',
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
                [ RIPRISTINA CONNESSIONE &amp; ACQUISISCI ]
              </Button>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={{ marginTop: '24px', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontSize: '10px', color: '#27272a', letterSpacing: '0.1em' }}>
              KITWER26 © 2026 — Questo messaggio è generato automaticamente. Non rispondere.
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}

export default PaymentFailed;
