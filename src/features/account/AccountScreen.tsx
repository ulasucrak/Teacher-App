import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Screen, SectionHeader, Text, TextField } from '@/components/ui';
import { useAuth } from '@/features/auth';
import { colors, layout, spacing } from '@/theme';

import { ChangePasswordForm } from './components/ChangePasswordForm';
import { DeleteAccountConfirmation } from './components/DeleteAccountConfirmation';
import { useAccountActions } from './hooks/useAccountActions';

export function AccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const actions = useAccountActions();
  const storedName = typeof user?.user_metadata.full_name === 'string' ? user.user_metadata.full_name : '';
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const fullName = nameDraft ?? storedName;
  const [profileError, setProfileError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const busy = actions.pending !== null;

  const save = async () => {
    setProfileError(null);
    const result = await actions.updateProfile(fullName);
    if (!result.ok) setProfileError(result.message);
    else setNameDraft(null);
  };
  const logout = async () => {
    setLogoutError(null);
    const result = await actions.logout();
    if (!result.ok) setLogoutError(result.message);
  };
  const remove = async () => {
    setDeleteError(null);
    const result = await actions.deleteAccount();
    if (!result.ok) setDeleteError(result.message);
  };

  return (
    <Screen title="Hesap" back={() => router.canGoBack() ? router.back() : router.replace('/')} testID="account-screen"
      contentStyle={styles.content}>
      <View style={styles.section}>
        <SectionHeader title="Hesap bilgileriniz" />
        <TextField label="E-posta" value={user?.email ?? ''} editable={false} testID="account-email" />
        <TextField label="Ad soyad" value={fullName} onChangeText={(value) => { setNameDraft(value); setProfileError(null); }}
          autoCapitalize="words" autoComplete="name" textContentType="name" editable={!busy} testID="account-name" />
        {profileError ? <Banner kind="error" message={profileError} /> : null}
        <Button label="Ad soyadı kaydet" onPress={() => void save()} loading={actions.pending === 'profile'} disabled={busy}
          testID="account-save-profile" />
      </View>
      <View style={styles.divider} />
      <ChangePasswordForm onSubmit={actions.changePassword} loading={actions.pending === 'password'} disabled={busy} />
      <View style={styles.divider} />
      <View style={styles.section}>
        {logoutError ? <Banner kind="error" message={logoutError} /> : null}
        <Button label="Çıkış yap" icon="logout" variant="secondary" onPress={() => void logout()}
          disabled={busy} loading={actions.pending === 'logout'} testID="account-logout" />
        <SectionHeader title="Hesabı silme" />
        <Text tone="muted">Hesabınızı sildiğinizde tüm sınıflarınız ve kayıtlarınız kalıcı olarak silinir.</Text>
        <Button label="Hesabımı sil" icon="trash" variant="ghost" disabled={busy}
          style={styles.deleteButton} onPress={() => { setDeleteError(null); setDeleteOpen(true); }} testID="account-delete" />
      </View>
      <DeleteAccountConfirmation visible={deleteOpen} loading={actions.pending === 'delete'} error={deleteError}
        onConfirm={() => void remove()} onCancel={() => setDeleteOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  section: { gap: spacing.md },
  divider: { height: layout.hairline, backgroundColor: colors.rule },
  deleteButton: { backgroundColor: colors.dangerMuted },
});
