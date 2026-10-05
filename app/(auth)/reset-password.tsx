import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { type TextInput } from 'react-native';

import { Banner, Button, LoadingState, TextField, useToast } from '@/components/ui';
import { AuthPage, MIN_PASSWORD_LENGTH, RESET_PASSWORD_PATH, useAuth, validatePassword } from '@/features/auth';

type Phase = { kind: 'verifying' } | { kind: 'ready' } | { kind: 'invalid'; message: string };

/**
 * E-postadaki sıfırlama bağlantısının açtığı ekran
 * (`teacherapp://reset-password#access_token=…` ya da `?code=…`).
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session, recoverSession, updatePassword } = useAuth();
  const url = Linking.useLinkingURL();
  const handledUrl = useRef<string | null>(null);
  const confirmRef = useRef<TextInput>(null);

  const [phase, setPhase] = useState<Phase>({ kind: 'verifying' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    const isRecoveryLink = Boolean(url && url.includes(RESET_PASSWORD_PATH.slice(1)) && /[#?&](access_token|code|error)=/.test(url));
    if (!isRecoveryLink) {
      // Bağlantı yoksa yalnızca açık bir oturumla şifre değiştirilebilir.
      if (handledUrl.current === null) {
        setPhase(
          session
            ? { kind: 'ready' }
            : { kind: 'invalid', message: 'Bu ekran e-postadaki şifre sıfırlama bağlantısıyla açılır. Giriş ekranından yeni bir bağlantı isteyin.' },
        );
      }
      return;
    }
    if (handledUrl.current === url) return;
    handledUrl.current = url;
    setPhase({ kind: 'verifying' });
    recoverSession(url).then((result) => {
      setPhase(result.ok ? { kind: 'ready' } : { kind: 'invalid', message: result.message });
    });
  }, [url, session, recoverSession]);

  const submit = async () => {
    // Klavye 'gönder' + buton aynı anda tetiklenebilir; state güncellenmeden önce de engelle.
    if (submitting || inFlight.current) return;
    const next = {
      password: validatePassword(password, 'register'),
      confirm: confirm === password ? null : 'Şifreler aynı değil. İkinci alana aynı şifreyi yazın.',
    };
    setErrors(next);
    setFormError(null);
    if (next.password || next.confirm) return;

    inFlight.current = true;
    setSubmitting(true);
    const result = await updatePassword(password);
    inFlight.current = false;
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    toast.show('Şifreniz güncellendi');
    router.replace('/');
  };

  if (phase.kind === 'verifying') {
    return <LoadingState label="Bağlantı doğrulanıyor" />;
  }

  if (phase.kind === 'invalid') {
    return (
      <AuthPage title="Bağlantı kullanılamıyor" description="Şifrenizi sıfırlamak için yeni bir bağlantı isteyin." back={false}>
        <Banner kind="error" message={phase.message} />
        <Button label="Yeni bağlantı iste" onPress={() => router.replace('/forgot-password')} />
        <Button label="Giriş ekranına dön" variant="ghost" onPress={() => router.replace('/login')} />
      </AuthPage>
    );
  }

  return (
    <AuthPage title="Yeni şifre belirleyin" description="Bundan sonra bu şifreyle giriş yapacaksınız." back={false}>
      {formError ? <Banner kind="error" message={formError} /> : null}
      <TextField
        label="Yeni şifre"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (errors.password) setErrors((e) => ({ ...e, password: null }));
        }}
        error={errors.password}
        hint={`En az ${MIN_PASSWORD_LENGTH} karakter.`}
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={confirmRef}
        label="Yeni şifre (tekrar)"
        value={confirm}
        onChangeText={(v) => {
          setConfirm(v);
          if (errors.confirm) setErrors((e) => ({ ...e, confirm: null }));
        }}
        error={errors.confirm}
        password
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <Button label="Şifreyi kaydet" onPress={submit} loading={submitting} />
    </AuthPage>
  );
}
