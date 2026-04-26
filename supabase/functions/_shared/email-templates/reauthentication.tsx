/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirm it’s you</Heading>
        <Text style={text}>Use this code to continue securely in HomeStock:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can
          safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#211c18',
  margin: '0 0 18px',
}
const text = {
  fontSize: '15px',
  color: '#514a43',
  lineHeight: '1.6',
  margin: '0 0 22px',
}
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#211c18',
  backgroundColor: '#f5f1ea',
  borderRadius: '12px',
  padding: '14px 16px',
  letterSpacing: '2px',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#80766d', margin: '30px 0 0', lineHeight: '1.5' }