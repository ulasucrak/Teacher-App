import { StyleSheet, View } from 'react-native';

import { Banner, Button, Sheet, Text } from '@/components/ui';
import { spacing } from '@/theme';

interface Props {
  visible: boolean;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAccountConfirmation({ visible, loading, error, onConfirm, onCancel }: Props) {
  return (
    <Sheet visible={visible} title="Hesabınız silinsin mi?" onClose={loading ? () => undefined : onCancel}
      testID="account-delete-confirmation">
      <View style={styles.body}>
        <Text>Tüm sınıflarınız, öğrencileriniz, formlarınız, yanıtlarınız ve kayıtlarınız silinir. Hesabınız ve e-posta adresiniz de silinir. Bu işlem geri alınamaz.</Text>
        {error ? <Banner kind="error" message={error} /> : null}
        <Button label="Hesabımı kalıcı olarak sil" variant="destructive" loading={loading} onPress={onConfirm}
          testID="account-delete-confirm" />
        <Button label="Vazgeç" variant="secondary" disabled={loading} onPress={onCancel} testID="account-delete-cancel" />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ body: { gap: spacing.lg } });
