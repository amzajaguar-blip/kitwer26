import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components';
import * as React from 'react';

export const OrderConfirmation = ({
  orderNumber,
  customerName,
}: {
  orderNumber: string;
  customerName: string;
}) => (
  <Html>
    <Head />
    <Preview>Ordine #{orderNumber} confermato - Grazie per aver scelto Kitwer26</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Grazie per il tuo acquisto, {customerName}!</Heading>
        <Text style={text}>
          Il tuo ordine <strong>#{orderNumber}</strong> è stato ricevuto correttamente ed è in
          fase di elaborazione.
        </Text>
        <Section style={buttonContainer}>
          <Text style={text}>Puoi seguire lo stato del tuo ordine cliccando qui:</Text>
          <Link
            href={`https://kitwer26.com/account/orders/${orderNumber}`}
            style={button}
          >
            Visualizza Ordine
          </Link>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>Kitwer26 - Tecnologia e Soluzioni per il tuo spazio.</Text>
      </Container>
    </Body>
  </Html>
);

// Stili in linea (necessari per le email)
const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' };
const container = { backgroundColor: '#ffffff', padding: '20px', borderRadius: '5px' };
const h1 = { color: '#333', fontSize: '24px' };
const text = { color: '#555', fontSize: '16px' };
const button = {
  backgroundColor: '#000',
  color: '#fff',
  padding: '12px 20px',
  borderRadius: '5px',
  textDecoration: 'none',
};
const buttonContainer = { textAlign: 'center' as const, margin: '20px 0' };
const hr = { borderColor: '#ccc', margin: '20px 0' };
const footer = { fontSize: '12px', color: '#888', textAlign: 'center' as const };
