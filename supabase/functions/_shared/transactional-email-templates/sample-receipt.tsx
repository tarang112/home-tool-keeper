import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; receiptNumber?: string; total?: string; summary?: string }

const SampleReceiptEmail = ({ name, receiptNumber, total, summary }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sample HomeStock receipt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>HomeStock</Text>
        <Heading style={h1}>{name ? `Sample receipt for ${name}` : 'Sample receipt'}</Heading>
        <Text style={text}>This is a test receipt message from your checkout/order flow settings.</Text>
        <Section style={panel}>
          <Text style={panelText}>Receipt {receiptNumber || 'TEST-1001'}</Text>
          <Text style={panelText}>{summary || 'Household plan · 1 location/property'}</Text>
          <Text style={totalText}>Total: {total || '$6.00'}</Text>
        </Section>
        <Text style={footer}>If this arrived correctly, receipt email delivery is ready.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SampleReceiptEmail,
  subject: 'Sample receipt from HomeStock',
  displayName: 'Sample receipt',
  previewData: { name: 'Team', receiptNumber: 'TEST-1001', total: '$6.00', summary: 'Household plan · 1 location/property' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const brand = { color: '#b95a1c', fontSize: '14px', fontWeight: 700, margin: '0 0 18px' }
const h1 = { color: '#211c18', fontSize: '28px', lineHeight: '1.2', margin: '0 0 16px', fontWeight: 700 }
const text = { color: '#514a43', fontSize: '16px', lineHeight: '1.6', margin: '0 0 20px' }
const panel = { backgroundColor: '#f5f1ea', borderRadius: '12px', padding: '16px', margin: '20px 0' }
const panelText = { color: '#211c18', fontSize: '15px', lineHeight: '1.5', margin: '0 0 8px' }
const totalText = { color: '#211c18', fontSize: '18px', lineHeight: '1.4', margin: '10px 0 0', fontWeight: 700 }
const footer = { color: '#80766d', fontSize: '13px', lineHeight: '1.5', margin: '28px 0 0' }