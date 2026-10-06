import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { Banner, Button, TextField } from '@/components/ui';
import { AuthPage, useAuth, validateEmail } from '@/features/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const submit = async () => {
    // Klavye 'gönder' + buton aynı anda tetiklenebilir; state güncellenmeden önce de engelle.
    if (submitting || inFlight.current) return;
    const emailError = validateEmail(email);
    setError(emailError);
    setFormError(null);
    if (emailError) return;

    inFlight.current = true;
    setSubmitting(true);
    const result = await resetPassword(email);
    inFlight.current = false;
    setSubmitting(false);
    if (result.ok) setSent(true);
    else setFormError(result.message);
  };

  return (
    <AuthPage
      title="Şifrenizi sıfırlayın"
      description="E-posta adresinize bir sıfırlama bağlantısı gönderelim."
      back
      testID="forgot-screen"
    >
      {sent ? (
        <>
          <Banner
            kind="success"
            title="Bağlantı gönderildi"
            message={`${email.trim()} adresine gelen bağlantıyla yeni şifrenizi belirleyin, sonra giriş yapın.`}
          />
          <Button label="Giriş ekranına dön" onPress={() => router.replace('/login')} testID="forgot-done" />
        </>
      ) : (
        <>
          {formError ? <Banner kind="error" message={formError} /> : null}
          <TextField
            label="E-posta"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) setError(null);
            }}
            error={error}
            placeholder="ad@okul.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="forgot-email"
            returnKeyType="send"
            onSubmitEditing={submit}
          />
          <Button label="Bağlantı gönder" onPress={submit} loading={submitting} testID="forgot-submit" />
        </>
      )}
    </AuthPage>
  );
}
