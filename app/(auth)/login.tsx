import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { Banner, Button, Text, TextField } from '@/components/ui';
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

  const submit = async () => {
    const next = { email: validateEmail(email), password: validatePassword(password, 'login') };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    // Başarılıysa (auth) layout'u oturumu görüp uygulamaya yönlendirir.
    if (!result.ok) setFormError(result.message);
  };

  return (
    <AuthPage
      size="display"
      title="Sınıf Defteri"
      description="Yoklama, ödev kontrolü ve sözlü notlarınız tek defterde."
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
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <View style={styles.actions}>
        <Button label="Giriş yap" onPress={submit} loading={submitting} />
        <Button
          label="Şifremi unuttum"
          variant="ghost"
          size="sm"
          fullWidth={false}
          style={styles.ghostAlign}
          onPress={() => router.push('/forgot-password')}
        />
      </View>

      <View style={styles.switch}>
        <Text variant="body" tone="muted">
          Hesabınız yok mu?
        </Text>
        <Button label="Hesap oluştur" variant="secondary" onPress={() => router.push('/register')} />
      </View>
    </AuthPage>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm, alignItems: 'flex-start' },
  ghostAlign: { marginLeft: -spacing.lg },
  switch: { marginTop: spacing.xxl, gap: spacing.sm },
});
