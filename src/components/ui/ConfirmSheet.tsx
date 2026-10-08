import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Button } from './Button';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface ConfirmSheetProps {
  visible: boolean;
  /** Soru olarak eylem: "5/B sınıfı silinsin mi?" */
  title: string;
  /** Sonuç: "24 öğrenci ve 3 form da silinir. Bu işlem geri alınamaz." */
  message?: string;
  /** Eylem adı: "Sınıfı sil". "Tamam/Evet" değil. */
  confirmLabel: string;
  /** Varsayılan "Vazgeç". */
  cancelLabel?: string;
  /** Kırmızı onay (varsayılan true). false → sarı birincil. */
  destructive?: boolean;
  /** Eylem sürerken panel açık kalır ve buton yükleniyor gösterir. */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDismissed?: () => void;
  /** Panele `testID`; butonlara `${testID}-confirm` / `${testID}-cancel`. */
  testID?: string;
}

/**
 * Geri alınamaz eylem onayı (sistem Alert'inin yerine, tek elle erişilebilir altta).
 * Onay butonu başparmağa en yakın yerde, "Vazgeç" hemen altında.
 */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Vazgeç',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
  onDismissed,
  testID,
}: ConfirmSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={loading ? () => undefined : onCancel}
      onDismissed={onDismissed}
      title={title}
      testID={testID}
    >
      <View style={styles.body}>
        {message ? (
          <Text variant="body" tone="muted">
            {message}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={confirmLabel}
            variant={destructive ? 'destructive' : 'primary'}
            loading={loading}
            onPress={onConfirm}
            testID={testID ? `${testID}-confirm` : undefined}
          />
          <Button
            label={cancelLabel}
            variant="secondary"
            disabled={loading}
            onPress={onCancel}
            testID={testID ? `${testID}-cancel` : undefined}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xl },
  // Düğmelerin sert gölgesi için aralık geniş tutulur.
  actions: { gap: spacing.lg },
});
