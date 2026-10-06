import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Banner, Button, TextField } from '@/components/ui';
import { AuthPage, useAuth, validateEmail, validatePassword } from '@/features/auth';
import { spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const submit = async () => {
    // Klavye 'gönder' + buton aynı anda tetiklenebilir; state güncellenmeden önce de engelle.
    if (submitting || inFlight.current) return;
    const next = { email: validateEmail(email), password: validatePassword(password, 'login') };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    inFlight.current = true;
    setSubmitting(true);
    const result = await signIn(email, password);
    inFlight.current = false;
    setSubmitting(false);
    // Başarılıysa (auth) layout'u oturumu görüp uygulamaya yönlendirir.
    if (!result.ok) setFormError(result.message);
  };

  return (
    <AuthPage
      size="display"
      title="Sınıf Defteri"
      description="Yoklama ve ödev kontrolü, ders arasında birkaç dokunuşla."
      switchPrompt={{
        text: 'Hesabınız yok mu?',
        actionLabel: 'Hesap oluşturun',
        onPress: () => router.push('/register'),
        testID: 'login-register',
      }}
      testID="login-screen"
    >
      {formError ? <Banner kind="error" message={formError} /> : null}

      <TextField
        label="E-posta"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (errors.email) setErrors((e) => ({ ...e, email: null }));
        }}
        error={errors.email}
        placeholder="ad@okul.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="username"
        testID="login-email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={passwordRef}
        label="Şifre"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: null }));
        }}
        error={errors.password}
        password
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        testID="login-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <View style={styles.actions}>
        <Button label="Giriş yap" onPress={submit} loading={submitting} testID="login-submit" />
        <Button
          label="Şifremi unuttum"
          variant="ghost"
          size="sm"
          fullWidth={false}
          style={styles.forgot}
          onPress={() => router.push('/forgot-password')}
          testID="login-forgot"
        />
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  forgot: { alignSelf: 'center' },
});
