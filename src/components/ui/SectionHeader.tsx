import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, spacing } from '@/theme';

import { Button } from './Button';
import { CountBubble } from './CountBubble';
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

/** Bölüm başlığı: iri başlık + kurşun sayı dairesi solda, en fazla bir çerçeveli küçük eylem sağda (mockup `.sec`). */
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
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        {count !== undefined ? <CountBubble value={count} /> : null}
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          icon={actionIcon}
          variant="secondary"
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
  titles: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  // Düğmenin sert gölgesi için sağda pay bırakılır.
  action: { marginRight: spacing.xs },
});
