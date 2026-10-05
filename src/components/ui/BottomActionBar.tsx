import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Button, type ButtonVariant } from './Button';
import type { IconName } from './Icon';
import { Text } from './Text';

export interface BottomAction {
  label: string;
  onPress: () => void;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

export interface BottomActionBarProps {
  /** Ekranın tek ana eylemi (sarı). */
  primary: BottomAction & { variant?: Extract<ButtonVariant, 'primary' | 'destructive'> };
  /** İsteğe bağlı yan eylem ("Geri", "Vazgeç") — solda, içerik genişliğinde. */
  secondary?: BottomAction;
  /** Butonun üstünde kısa durum metni ("3 öğrencide kaydedilmemiş değişiklik"). */
  hint?: string;
}

/**
 * Alt eylem çubuğunun içeriği: `Screen footer={<BottomActionBar … />}` ile kullanın
 * (Screen bunu `StickyFooter` içine koyar). Sihirbaz adımları ve doldurma ekranı için.
 */
export function BottomActionBar({ primary, secondary, hint }: BottomActionBarProps) {
  const main = (
    <Button
      label={primary.label}
      onPress={primary.onPress}
      icon={primary.icon}
      loading={primary.loading}
      disabled={primary.disabled}
      variant={primary.variant ?? 'primary'}
      accessibilityHint={primary.accessibilityHint}
      testID={primary.testID}
      style={secondary ? styles.grow : undefined}
    />
  );

  return (
    <View style={styles.wrap}>
      {hint ? (
        <Text variant="caption" tone="muted" align="center" accessibilityLiveRegion="polite">
          {hint}
        </Text>
      ) : null}
      {secondary ? (
        <View style={styles.row}>
          <Button
            label={secondary.label}
            onPress={secondary.onPress}
            icon={secondary.icon}
            loading={secondary.loading}
            disabled={secondary.disabled}
            variant="secondary"
            fullWidth={false}
            accessibilityHint={secondary.accessibilityHint}
            testID={secondary.testID}
          />
          {main}
        </View>
      ) : (
        main
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  grow: { flex: 1 },
});
