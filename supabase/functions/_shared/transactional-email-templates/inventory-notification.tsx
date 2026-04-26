import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; title?: string; message?: string; itemName?: string }

const InventoryNotificationEmail = ({ name, title, message, itemName }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title || 'HomeStock notification'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>HomeStock</Text>
        <Heading style={h1}>{title || 'Inventory notification'}</Heading>
        <Text style={text}>{name ? `${name}, ` : ''}{message || 'There is an update in your home inventory.'}</Text>
        {itemName ? <Section style={panel}><Text style={panelText}>{itemName}</Text></Section> : null}
        <Text style={footer}>This notification was triggered by your HomeStock settings.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InventoryNotificationEmail,
  subject: (data) => data.title || 'HomeStock notification',
  displayName: 'Inventory notification',
  previewData: { name: 'Alex', title: 'Restock reminder', message: 'Milk is out of stock.', itemName: 'Milk' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const brand = { color: '#b95a1c', fontSize: '14px', fontWeight: 700, margin: '0 0 18px' }
const h1 = { color: '#211c18', fontSize: '28px', lineHeight: '1.2', margin: '0 0 16px', fontWeight: 700 }
const text = { color: '#514a43', fontSize: '16px', lineHeight: '1.6', margin: '0 0 20px' }
const panel = { backgroundColor: '#eef6f2', borderRadius: '12px', padding: '16px', margin: '20px 0' }
const panelText = { color: '#211c18', fontSize: '15px', lineHeight: '1.5', margin: 0, fontWeight: 600 }
const footer = { color: '#80766d', fontSize: '13px', lineHeight: '1.5', margin: '28px 0 0' }
