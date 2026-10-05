import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import { Banner, Button, TextField } from '@/components/ui';
import {
  AuthPage,
  MIN_PASSWORD_LENGTH,
  useAuth,
  validateEmail,
  validateFullName,
  validatePassword,
} from '@/features/auth';

type FieldErrors = { fullName?: string | null; email?: string | null; password?: string | null };

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const clear = (key: keyof FieldErrors) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  const submit = async () => {
    const next: FieldErrors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password, 'register'),
    };
    setErrors(next);
    setFormError(null);
    if (next.fullName || next.email || next.password) return;

    setSubmitting(true);
    const result = await signUp(email, password, fullName);
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    // Oturum açıldıysa (auth) layout'u uygulamaya yönlendirir.
    if (result.needsEmailConfirmation) setConfirmationSentTo(email.trim());
  };

  if (confirmationSentTo) {
    return (
      <AuthPage
        title="E-postanızı doğrulayın"
        description={`${confirmationSentTo} adresine bir doğrulama bağlantısı gönderdik.`}
        back
      >
        <Banner
          kind="success"
          message="Bağlantıya dokunduktan sonra bu ekrana dönüp giriş yapın. E-posta gelmediyse gereksiz klasörüne bakın."
        />
        <Button label="Giriş ekranına dön" onPress={() => router.replace('/login')} />
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="Hesap oluşturun"
      description="Sınıflarınız, öğrencileriniz ve formlarınız bu hesapta saklanır."
      back
    >
      {formError ? <Banner kind="error" message={formError} /> : null}

      <TextField
        label="Ad soyad"
        value={fullName}
        onChangeText={(v) => {
          setFullName(v);
          clear('fullName');
        }}
        error={errors.fullName}
        placeholder="Ayşe Yılmaz"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={emailRef}
        label="E-posta"
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          clear('email');
        }}
        error={errors.email}
        placeholder="ad@okul.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
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
          clear('password');
        }}
        error={errors.password}
        hint={`En az ${MIN_PASSWORD_LENGTH} karakter.`}
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button label="Hesap oluştur" onPress={submit} loading={submitting} />
    </AuthPage>
  );
}
