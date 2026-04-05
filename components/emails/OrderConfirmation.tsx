import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

export interface OrderConfirmationProps {
  orderId:        string;
  customerName:   string;
  items:          Array<{
    name:     string;
    price:    number;
    quantity: number;
    asin?:    string | null;
  }>;
  totalAmount:    number;
  discountAmount?: number;
}

export const OrderConfirmation = ({
  orderId,
  customerName,
  items,
  totalAmount,
  discountAmount = 0,
}: OrderConfirmationProps) => {
  const shortId = String(orderId).slice(0, 8).toUpperCase();

  return (
    <Html lang="it">
      <Head />
      <Preview>
        🛡️ [KITWER26] PROTOCOLLO ATTIVATO: Ordine #{shortId} in fase di dispacciamento
      </Preview>

      <Body style={s.body}>
        <Container style={s.container}>

          {/* ── Header ── */}
          <Section style={s.header}>
            <Text style={s.logoText}>KITWER<span style={s.logoAccent}>26</span></Text>
            <Text style={s.headerSubtitle}>THE ARCHITECT OF YOUR DIGITAL FORTRESS</Text>
          </Section>

          {/* ── Status banner ── */}
          <Section style={s.statusBanner}>
            <Text style={s.statusBadge}>✦ PAGAMENTO CONFERMATO</Text>
            <Text style={s.statusTitle}>
              Il tuo Bundle Esclusivo è qui!
            </Text>
          </Section>

          <Hr style={s.divider} />

          {/* ── Benvenuto premium ── */}
          <Section style={s.section}>
            <Text style={s.welcomeGreeting}>Ciao {customerName},</Text>
            <Text style={s.welcomeBody}>
              Grazie per il tuo ordine e benvenuto nell&apos;élite. Il tuo pagamento è stato
              confermato con successo.
            </Text>
            <Text style={s.welcomeBody}>
              Come promesso, <strong style={{ color: '#22d3ee' }}>in allegato a questa email</strong> troverai
              il tuo Bundle in formato PDF, pronto per essere scaricato e consultato.
            </Text>
            <Text style={s.welcomeBody}>
              Se hai domande, problemi con il download o hai bisogno di supporto tecnico,
              rispondi direttamente a questa email. Il nostro team è a tua completa disposizione.
            </Text>
          </Section>

          <Hr style={s.divider} />

          {/* ── Identificazione operatore ── */}
          <Section style={s.section}>
            <Row>
              <Column>
                <Text style={s.fieldLabel}>IDENTIFICAZIONE OPERATORE</Text>
                <Text style={s.fieldValue}>{customerName}</Text>
              </Column>
              <Column>
                <Text style={s.fieldLabel}>STATO ORDINE</Text>
                <Text style={{ ...s.fieldValue, color: '#22d3ee' }}>ASSET IN PREPARAZIONE</Text>
              </Column>
            </Row>
            <Row style={{ marginTop: '8px' }}>
              <Column>
                <Text style={s.fieldLabel}>LIVELLO DI SICUREZZA</Text>
                <Text style={{ ...s.fieldValue, color: '#f97316' }}>CRITICAL / HIGH-TICKET</Text>
              </Column>
              <Column>
                <Text style={s.fieldLabel}>ID OPERAZIONE</Text>
                <Text style={{ ...s.fieldValue, fontFamily: 'monospace' }}>{shortId}</Text>
              </Column>
            </Row>
          </Section>

          <Hr style={s.divider} />

          {/* ── Riepilogo asset ── */}
          <Section style={s.section}>
            <Text style={s.sectionTitle}>📦 RIEPILOGO ASSET ACQUISITI</Text>

            {items.map((item, i) => (
              <Row key={i} style={s.itemRow}>
                <Column style={{ flex: 1 }}>
                  <Text style={s.itemName}>
                    {item.name}
                    {item.quantity > 1 && (
                      <span style={s.itemQty}> ×{item.quantity}</span>
                    )}
                  </Text>
                  {item.asin && (
                    <Text style={s.itemAsin}>
                      Codice ASIN: {item.asin}
                    </Text>
                  )}
                </Column>
                <Column style={{ textAlign: 'right' as const, minWidth: '80px' }}>
                  <Text style={s.itemPrice}>
                    €{(item.price * item.quantity).toFixed(2).replace('.', ',')}
                  </Text>
                </Column>
              </Row>
            ))}

            <Hr style={{ ...s.divider, marginTop: '12px' }} />

            {/* Totale + risparmio */}
            {discountAmount > 0 && (
              <Row style={{ marginBottom: '4px' }}>
                <Column style={{ flex: 1 }}>
                  <Text style={s.totalLabel}>RISPARMIO TATTICO APPLICATO</Text>
                </Column>
                <Column style={{ textAlign: 'right' as const }}>
                  <Text style={{ ...s.totalLabel, color: '#22d3ee' }}>
                    −€{discountAmount.toFixed(2).replace('.', ',')} (Bundle Promo)
                  </Text>
                </Column>
              </Row>
            )}

            <Row>
              <Column style={{ flex: 1 }}>
                <Text style={s.totalLabel}>VALORE TOTALE DELLA FORNITURA</Text>
              </Column>
              <Column style={{ textAlign: 'right' as const }}>
                <Text style={s.totalAmount}>
                  €{totalAmount.toFixed(2).replace('.', ',')}
                </Text>
              </Column>
            </Row>
          </Section>

          <Hr style={s.divider} />

          {/* ── Fase successiva ── */}
          <Section style={s.section}>
            <Text style={s.sectionTitle}>🛰️ FASE SUCCESSIVA: TRACKING</Text>
            <Text style={s.bodyText}>
              Non appena il corriere avrà preso in carico i tuoi asset, riceverai una
              seconda comunicazione con il codice di tracciamento. Da quel momento
              potrai monitorare lo spostamento della merce in tempo reale verso le tue
              coordinate su{' '}
              <Link href="https://t.17track.net/it" style={s.link}>17track.net</Link>.
            </Text>
          </Section>

          {/* ── CTA ── */}
          <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
            <Link href="https://kitwer26.com" style={s.ctaButton}>
              TORNA AL CENTRO DI COMANDO →
            </Link>
          </Section>

          <Hr style={s.divider} />

          {/* ── Nota sicurezza ── */}
          <Section style={s.section}>
            <Text style={s.sectionTitle}>⚠️ NOTA DI SICUREZZA</Text>
            <Text style={s.bodyText}>
              Conserva questa email. Contiene le prove d&apos;acquisto necessarie per la
              garanzia e il supporto tecnico prioritario. Se hai bisogno di assistenza
              immediata, rispondi a questo messaggio citando il tuo ID Ordine:{' '}
              <span style={{ color: '#22d3ee', fontFamily: 'monospace' }}>{shortId}</span>.
            </Text>
          </Section>

          <Hr style={s.divider} />

          {/* ── Footer ── */}
          <Section style={s.footer}>
            <Text style={s.footerTagline}>Stay secure. Stay tactical.</Text>
            <Text style={s.footerBrand}>
              TEAM KITWER26
            </Text>
            <Text style={s.footerSub}>
              The Architect of your Digital Fortress
            </Text>
            <Text style={s.footerContact}>
              Assistenza: <Link href="mailto:support@kitwer26.com" style={s.link}>
                support@kitwer26.com
              </Link>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
};

// ── Stili inline (obbligatori per compatibilità email client) ─────────────────
const s = {
  body: {
    backgroundColor: '#0a0a0a',
    fontFamily: 'Arial, Helvetica, sans-serif',
    margin: '0',
    padding: '20px 0',
  },
  container: {
    backgroundColor: '#0f0f0f',
    border: '1px solid #1e1e1e',
    borderRadius: '4px',
    maxWidth: '560px',
    margin: '0 auto',
    overflow: 'hidden' as const,
  },
  header: {
    backgroundColor: '#050505',
    borderBottom: '1px solid #1a1a1a',
    padding: '28px 32px 20px',
    textAlign: 'center' as const,
  },
  logoText: {
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '900',
    letterSpacing: '6px',
    margin: '0',
    fontFamily: 'monospace',
  },
  logoAccent: {
    color: '#22d3ee',
  },
  headerSubtitle: {
    color: '#3f3f46',
    fontSize: '9px',
    letterSpacing: '3px',
    margin: '6px 0 0',
    fontFamily: 'monospace',
  },
  statusBanner: {
    backgroundColor: 'rgba(34,211,238,0.04)',
    borderBottom: '1px solid rgba(34,211,238,0.12)',
    padding: '20px 32px',
    textAlign: 'center' as const,
  },
  statusBadge: {
    color: '#22d3ee',
    fontSize: '10px',
    letterSpacing: '4px',
    fontFamily: 'monospace',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
  },
  statusTitle: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    margin: '0',
  },
  divider: {
    borderColor: '#1a1a1a',
    borderTop: '1px solid #1a1a1a',
    margin: '0',
  },
  section: {
    padding: '20px 32px',
  },
  sectionTitle: {
    color: '#22d3ee',
    fontSize: '11px',
    fontFamily: 'monospace',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    margin: '0 0 14px',
    fontWeight: '700',
  },
  fieldLabel: {
    color: '#52525b',
    fontSize: '9px',
    fontFamily: 'monospace',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    margin: '0 0 3px',
  },
  fieldValue: {
    color: '#d4d4d8',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0',
  },
  itemRow: {
    borderBottom: '1px solid #1a1a1a',
    paddingBottom: '10px',
    marginBottom: '10px',
  },
  itemName: {
    color: '#d4d4d8',
    fontSize: '12px',
    margin: '0 0 2px',
    lineHeight: '1.4',
  },
  itemQty: {
    color: '#71717a',
    fontSize: '11px',
  },
  itemAsin: {
    color: '#52525b',
    fontSize: '10px',
    fontFamily: 'monospace',
    margin: '2px 0 0',
  },
  itemPrice: {
    color: '#22d3ee',
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: 'monospace',
    margin: '0',
  },
  totalLabel: {
    color: '#71717a',
    fontSize: '10px',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
    margin: '4px 0',
  },
  totalAmount: {
    color: '#22d3ee',
    fontSize: '20px',
    fontWeight: '900',
    fontFamily: 'monospace',
    margin: '4px 0',
  },
  welcomeGreeting: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 16px',
    lineHeight: '1.3',
  },
  welcomeBody: {
    color: '#a1a1aa',
    fontSize: '14px',
    lineHeight: '1.8',
    margin: '0 0 12px',
  },
  bodyText: {
    color: '#71717a',
    fontSize: '13px',
    lineHeight: '1.7',
    margin: '0',
  },
  ctaButton: {
    backgroundColor: '#22d3ee',
    color: '#000000',
    fontSize: '12px',
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: '2px',
    padding: '14px 32px',
    borderRadius: '2px',
    textDecoration: 'none',
    display: 'inline-block',
  },
  link: {
    color: '#22d3ee',
    textDecoration: 'underline',
  },
  footer: {
    padding: '20px 32px 28px',
    textAlign: 'center' as const,
  },
  footerTagline: {
    color: '#3f3f46',
    fontSize: '11px',
    fontFamily: 'monospace',
    letterSpacing: '2px',
    margin: '0 0 8px',
    fontStyle: 'italic',
  },
  footerBrand: {
    color: '#71717a',
    fontSize: '12px',
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: '3px',
    margin: '0 0 2px',
  },
  footerSub: {
    color: '#3f3f46',
    fontSize: '10px',
    fontFamily: 'monospace',
    letterSpacing: '1px',
    margin: '0 0 12px',
  },
  footerContact: {
    color: '#52525b',
    fontSize: '11px',
    margin: '0',
  },
};

export default OrderConfirmation;
