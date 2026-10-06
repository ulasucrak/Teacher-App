import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui';
import { countText, type CountItem } from '@/features/history';
import { colors, radii, spacing, tones } from '@/theme';

interface ToneCountsProps {
  items: readonly CountItem[];
  /** Sayı yoksa gösterilen metin ("Kayıt yok"). */
  empty: string;
  /** Sınıf toplamı için normal metin boyutu; öğrenci satırlarında küçük. */
  variant?: 'body' | 'caption';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Sayım satırı: her seçeneğin sayısının önünde tonunun renginde küçük nokta ("● 5 Geldi  ● 1 İzinli").
 * Sığmazsa sarar. Renk yalnızca destek; anlam metindedir, ekran okuyucu tek cümle okur
 * ("5 Geldi, 1 İzinli"). Kaldırılmış seçenekler soluk noktayla gelir.
 */
export function ToneCounts({ items, empty, variant = 'caption', style, testID }: ToneCountsProps) {
  if (items.length === 0) {
    return (
      <Text variant={variant} tone="muted" testID={testID}>
        {empty}
      </Text>
    );
  }
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityLabel={items.map(countText).join(', ')}
      testID={testID}
    >
      {items.map((item) => (
        <View key={item.key} style={styles.item} importantForAccessibility="no-hide-descendants">
          <View
            style={[styles.dot, { backgroundColor: item.tone ? tones[item.tone].solid : colors.border }]}
            testID={testID ? `${testID}-dot-${item.key}` : undefined}
          />
          <Text variant={variant} tone={variant === 'caption' ? 'muted' : 'default'}>
            {countText(item)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.md, rowGap: spacing.xxs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radii.full },
});
