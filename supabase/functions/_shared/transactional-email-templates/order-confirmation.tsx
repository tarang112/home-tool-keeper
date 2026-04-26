import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; orderNumber?: string; summary?: string }

const OrderConfirmationEmail = ({ name, orderNumber, summary }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your HomeStock order confirmation</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>HomeStock</Text>
        <Heading style={h1}>{name ? `Thanks, ${name}` : 'Order confirmed'}</Heading>
        <Text style={text}>We received your order{orderNumber ? ` #${orderNumber}` : ''} and it is now confirmed.</Text>
        <Section style={panel}><Text style={panelText}>{summary || 'Your order details are saved and ready for review.'}</Text></Section>
        <Text style={footer}>HomeStock keeps every household detail organized.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data) => `Order confirmed${data.orderNumber ? ` #${data.orderNumber}` : ''}`,
  displayName: 'Order confirmation',
  previewData: { name: 'Alex', orderNumber: '1048', summary: 'Pantry restock request confirmed.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const brand = { color: '#b95a1c', fontSize: '14px', fontWeight: 700, margin: '0 0 18px' }
const h1 = { color: '#211c18', fontSize: '28px', lineHeight: '1.2', margin: '0 0 16px', fontWeight: 700 }
const text = { color: '#514a43', fontSize: '16px', lineHeight: '1.6', margin: '0 0 20px' }
const panel = { backgroundColor: '#f5f1ea', borderRadius: '12px', padding: '16px', margin: '20px 0' }
const panelText = { color: '#211c18', fontSize: '15px', lineHeight: '1.5', margin: 0 }
const footer = { color: '#80766d', fontSize: '13px', lineHeight: '1.5', margin: '28px 0 0' }
