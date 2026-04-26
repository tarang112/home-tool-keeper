/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  locale?: string
}

const copy = {
  en: { preview: 'Your HomeStock login link', heading: 'Your HomeStock login link', body: 'Click the button below to sign in to your HomeStock inventory. This link will expire shortly.', button: 'Sign In', footer: "If you didn't request this link, you can safely ignore this email." },
  ar: { preview: 'رابط تسجيل الدخول إلى HomeStock', heading: 'رابط تسجيل الدخول إلى HomeStock', body: 'اضغط الزر أدناه لتسجيل الدخول إلى مخزونك في HomeStock. ستنتهي صلاحية هذا الرابط قريبًا.', button: 'تسجيل الدخول', footer: 'إذا لم تطلب هذا الرابط، يمكنك تجاهل هذه الرسالة بأمان.' },
  es: { preview: 'Tu enlace de inicio de sesión de HomeStock', heading: 'Tu enlace de inicio de sesión de HomeStock', body: 'Haz clic en el botón para entrar a tu inventario de HomeStock. Este enlace caducará pronto.', button: 'Iniciar sesión', footer: 'Si no solicitaste este enlace, puedes ignorar este correo.' },
  fr: { preview: 'Votre lien de connexion HomeStock', heading: 'Votre lien de connexion HomeStock', body: 'Cliquez sur le bouton ci-dessous pour accéder à votre inventaire HomeStock. Ce lien expirera bientôt.', button: 'Se connecter', footer: 'Si vous n’avez pas demandé ce lien, vous pouvez ignorer cet e-mail.' },
  hi: { preview: 'आपका HomeStock लॉगिन लिंक', heading: 'आपका HomeStock लॉगिन लिंक', body: 'अपने HomeStock इन्वेंटरी में साइन इन करने के लिए नीचे दिए गए बटन पर क्लिक करें। यह लिंक जल्द समाप्त हो जाएगा।', button: 'साइन इन करें', footer: 'अगर आपने यह लिंक नहीं मांगा है, तो इस ईमेल को अनदेखा कर सकते हैं।' },
} as const

const getCopy = (locale?: string) => copy[(locale || 'en') as keyof typeof copy] || copy.en

export const MagicLinkEmail = ({ siteName, confirmationUrl, locale }: MagicLinkEmailProps) => {
  const t = getCopy(locale)
  return (
    <Html lang={locale || 'en'} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.heading}</Heading>
          <Text style={text}>{t.body}</Text>
          <Button style={button} href={confirmationUrl}>{t.button}</Button>
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#211c18', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#514a43', lineHeight: '1.6', margin: '0 0 22px' }
const button = { backgroundColor: '#b95a1c', color: '#f9f7f2', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#80766d', margin: '30px 0 0', lineHeight: '1.5' }
