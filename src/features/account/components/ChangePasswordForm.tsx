import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, SectionHeader, TextField } from '@/components/ui';
import { MIN_PASSWORD_LENGTH, type AuthResult } from '@/features/auth';
import { spacing } from '@/theme';

import { validatePasswordChange } from '../hooks/useAccountActions';

interface Props {
  loading: boolean;
  disabled: boolean;
  onSubmit: (password: string, confirmation: string) => Promise<AuthResult>;
}

export function ChangePasswordForm({ loading, disabled, onSubmit }: Props) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (disabled || loading) return;
    const validation = validatePasswordChange(password, confirmation);
    setError(validation);
    if (validation) return;
    const result = await onSubmit(password, confirmation);
    if (!result.ok) { setError(result.message); return; }
    setPassword('');
    setConfirmation('');
  };

  return (
    <View style={styles.form}>
      <SectionHeader title="Şifre değiştirme" />
      {error ? <Banner kind="error" message={error} /> : null}
      <TextField label="Yeni şifre" value={password} onChangeText={(value) => { setPassword(value); setError(null); }}
        password hint={`En az ${MIN_PASSWORD_LENGTH} karakter.`} autoCapitalize="none" autoComplete="new-password"
        textContentType="newPassword" editable={!disabled} testID="account-password" />
      <TextField label="Yeni şifre tekrar" value={confirmation} onChangeText={(value) => { setConfirmation(value); setError(null); }}
        password autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" editable={!disabled}
        returnKeyType="done" onSubmitEditing={() => void submit()} testID="account-password-confirmation" />
      <Button label="Şifreyi değiştir" variant="secondary" onPress={() => void submit()} loading={loading}
        disabled={disabled} testID="account-change-password" />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.md } });
