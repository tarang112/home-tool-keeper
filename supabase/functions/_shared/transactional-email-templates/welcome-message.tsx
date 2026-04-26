import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string }

const WelcomeMessageEmail = ({ name }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to HomeStock</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>HomeStock</Text>
        <Heading style={h1}>{name ? `Welcome, ${name}` : 'Welcome to HomeStock'}</Heading>
        <Text style={text}>Your home inventory is ready. Start adding items, tracking expiry dates, and keeping every room organized.</Text>
        <Text style={footer}>You are receiving this because your account was created successfully.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeMessageEmail,
  subject: 'Welcome to HomeStock',
  displayName: 'Welcome message',
  previewData: { name: 'Alex' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px' }
const brand = { color: '#2f8a6b', fontSize: '14px', fontWeight: 700, margin: '0 0 18px' }
const h1 = { color: '#211c18', fontSize: '28px', lineHeight: '1.2', margin: '0 0 16px', fontWeight: 700 }
const text = { color: '#514a43', fontSize: '16px', lineHeight: '1.6', margin: '0 0 20px' }
const footer = { color: '#80766d', fontSize: '13px', lineHeight: '1.5', margin: '28px 0 0' }
