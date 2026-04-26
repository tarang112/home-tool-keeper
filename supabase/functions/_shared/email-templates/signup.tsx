/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  locale?: string
}

const copy = {
  en: {
    preview: 'Confirm your HomeStock email',
    heading: 'Confirm your HomeStock email',
    intro: 'Thanks for creating your HomeStock account for',
    confirmPrefix: 'Confirm this email address',
    confirmSuffix: 'to start tracking your inventory:',
    button: 'Confirm Email',
    footer: "If you didn't create an account, you can safely ignore this email.",
  },
  ar: {
    preview: 'أكّد بريدك الإلكتروني في HomeStock',
    heading: 'أكّد بريدك الإلكتروني في HomeStock',
    intro: 'شكرًا لإنشاء حسابك في HomeStock لـ',
    confirmPrefix: 'أكّد عنوان البريد الإلكتروني هذا',
    confirmSuffix: 'للبدء في تتبع مخزونك:',
    button: 'تأكيد البريد',
    footer: 'إذا لم تنشئ حسابًا، يمكنك تجاهل هذه الرسالة بأمان.',
  },
  es: {
    preview: 'Confirma tu correo de HomeStock',
    heading: 'Confirma tu correo de HomeStock',
    intro: 'Gracias por crear tu cuenta de HomeStock para',
    confirmPrefix: 'Confirma esta dirección de correo',
    confirmSuffix: 'para empezar a controlar tu inventario:',
    button: 'Confirmar correo',
    footer: 'Si no creaste una cuenta, puedes ignorar este correo.',
  },
  fr: {
    preview: 'Confirmez votre e-mail HomeStock',
    heading: 'Confirmez votre e-mail HomeStock',
    intro: 'Merci d’avoir créé votre compte HomeStock pour',
    confirmPrefix: 'Confirmez cette adresse e-mail',
    confirmSuffix: 'pour commencer à suivre votre inventaire :',
    button: 'Confirmer l’e-mail',
    footer: 'Si vous n’avez pas créé de compte, vous pouvez ignorer cet e-mail.',
  },
  hi: {
    preview: 'अपना HomeStock ईमेल पुष्टि करें',
    heading: 'अपना HomeStock ईमेल पुष्टि करें',
    intro: 'HomeStock खाता बनाने के लिए धन्यवाद',
    confirmPrefix: 'इस ईमेल पते की पुष्टि करें',
    confirmSuffix: 'ताकि आप अपनी इन्वेंटरी ट्रैक करना शुरू कर सकें:',
    button: 'ईमेल पुष्टि करें',
    footer: 'अगर आपने खाता नहीं बनाया है, तो इस ईमेल को अनदेखा कर सकते हैं।',
  },
} as const

const getCopy = (locale?: string) => copy[(locale || 'en') as keyof typeof copy] || copy.en

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
  locale,
}: SignupEmailProps) => {
  const t = getCopy(locale)
  const isRtl = locale === 'ar'

  return (
    <Html lang={locale || 'en'} dir={isRtl ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.heading}</Heading>
          <Text style={text}>
            {t.intro}{' '}
            <Link href={siteUrl} style={link}>
              <strong>{siteName}</strong>
            </Link>
            !
          </Text>
          <Text style={text}>
            {t.confirmPrefix} (
            <Link href={`mailto:${recipient}`} style={link}>
              {recipient}
            </Link>
            ) {t.confirmSuffix}
          </Text>
          <Button style={button} href={confirmationUrl}>
            {t.button}
          </Button>
          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default SignupEmail

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
const link = { color: '#b95a1c', textDecoration: 'underline' }
const button = {
  backgroundColor: '#b95a1c',
  color: '#f9f7f2',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#80766d', margin: '30px 0 0', lineHeight: '1.5' }
