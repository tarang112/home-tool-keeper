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

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  locale?: string
}

const copy = {
  en: { preview: 'Reset your password', heading: 'Reset your HomeStock password', body: 'We received a request to reset your HomeStock password. Click the button below to choose a new one.', button: 'Reset Password', footer: "If you didn't request a password reset, you can safely ignore this email. Your password will not be changed." },
  ar: { preview: 'إعادة تعيين كلمة المرور', heading: 'أعد تعيين كلمة مرور HomeStock', body: 'تلقينا طلبًا لإعادة تعيين كلمة مرور HomeStock. اضغط الزر أدناه لاختيار كلمة مرور جديدة.', button: 'إعادة تعيين كلمة المرور', footer: 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان ولن يتم تغيير كلمة مرورك.' },
  es: { preview: 'Restablece tu contraseña', heading: 'Restablece tu contraseña de HomeStock', body: 'Recibimos una solicitud para restablecer tu contraseña de HomeStock. Haz clic en el botón para elegir una nueva.', button: 'Restablecer contraseña', footer: 'Si no solicitaste restablecer la contraseña, puedes ignorar este correo. Tu contraseña no cambiará.' },
  fr: { preview: 'Réinitialisez votre mot de passe', heading: 'Réinitialisez votre mot de passe HomeStock', body: 'Nous avons reçu une demande de réinitialisation de votre mot de passe HomeStock. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.', button: 'Réinitialiser le mot de passe', footer: 'Si vous n’avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail. Votre mot de passe ne sera pas modifié.' },
  hi: { preview: 'अपना पासवर्ड रीसेट करें', heading: 'अपना HomeStock पासवर्ड रीसेट करें', body: 'हमें आपका HomeStock पासवर्ड रीसेट करने का अनुरोध मिला है। नया पासवर्ड चुनने के लिए नीचे दिए गए बटन पर क्लिक करें।', button: 'पासवर्ड रीसेट करें', footer: 'अगर आपने पासवर्ड रीसेट का अनुरोध नहीं किया है, तो इस ईमेल को अनदेखा करें। आपका पासवर्ड नहीं बदलेगा।' },
} as const

const getCopy = (locale?: string) => copy[(locale || 'en') as keyof typeof copy] || copy.en

export const RecoveryEmail = ({ siteName, confirmationUrl, locale }: RecoveryEmailProps) => {
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

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#211c18', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#514a43', lineHeight: '1.6', margin: '0 0 22px' }
const button = { backgroundColor: '#b95a1c', color: '#f9f7f2', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#80766d', margin: '30px 0 0', lineHeight: '1.5' }
