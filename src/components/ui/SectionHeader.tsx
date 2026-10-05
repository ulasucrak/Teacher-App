import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, spacing } from '@/theme';

import { Button } from './Button';
import type { IconName } from './Icon';
import { Text } from './Text';

export interface SectionHeaderProps {
  /** "Öğrenciler", "Formlar" — cümle düzeni, büyük harf yok. */
  title: string;
  /** Başlığın yanında soluk sayı: 28. */
  count?: number | string;
  /** Sağda tek hafif eylem ("+ Form", "Seç"). */
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IconName;
  actionAccessibilityLabel?: string;
  actionTestID?: string;
  /** Sayfa boşluğu ekle (FlatList başlığında true). */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Bölüm başlığı: başlık + sayı solda, en fazla bir hafif eylem sağda. */
export function SectionHeader({
  title,
  count,
  actionLabel,
  onAction,
  actionIcon,
  actionAccessibilityLabel,
  actionTestID,
  padded = false,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[styles.row, padded && styles.padded, style]}>
      <View style={styles.titles}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        {count !== undefined ? (
          <Text variant="bodySmall" tone="muted">
            {String(count)}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          icon={actionIcon}
          variant="ghost"
          size="sm"
          fullWidth={false}
          accessibilityLabel={actionAccessibilityLabel}
          testID={actionTestID}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouch,
    gap: spacing.md,
  },
  padded: { paddingHorizontal: layout.pageX },
  titles: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexShrink: 1 },
  action: { marginRight: -spacing.md },
});
