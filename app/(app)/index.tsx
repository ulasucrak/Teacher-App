import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { EmptyState, IconButton, Screen, Text, useToast } from '@/components/ui';
import { getDisplayName, useAuth } from '@/features/auth';

/**
 * GEÇİCİ ekran: sınıf listesi görevi bu dosyanın yerine gerçek "Sınıflarım" ekranını koyacak.
 */
export default function ClassesPlaceholderScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const name = getDisplayName(user);

  const confirmSignOut = () => {
    Alert.alert('Çıkış yapılsın mı?', 'Tekrar girmek için e-posta ve şifreniz gerekir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          const result = await signOut();
          if (!result.ok) toast.show(result.message, 'error');
        },
      },
    ]);
  };

  return (
    <Screen
      title="Sınıflarım"
      largeTitle
      back={false}
      headerRight={<IconButton icon="logout" accessibilityLabel="Çıkış yap" onPress={confirmSignOut} />}
    >
      {name ? (
        <Text variant="body" tone="muted">
          {name}
        </Text>
      ) : null}
      <EmptyState
        icon="people"
        title="Henüz sınıfınız yok"
        description="Sınıf eklediğinizde yoklama, ödev kontrolü ve sözlü formları burada listelenir."
        actionLabel="Sınıf ekle"
        onAction={() => router.push('/class/new')}
      />
    </Screen>
  );
}
