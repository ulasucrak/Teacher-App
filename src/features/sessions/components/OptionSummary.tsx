import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, layout, radii, spacing, tones } from '@/theme';
import type { FormOption } from '@/types/database';

export interface OptionSummaryProps {
  options: readonly FormOption[];
  counts: Readonly<Record<string, number>>;
  /** Seçimsiz öğrenci sayısı; verilmezse gösterilmez. */
  empty?: number;
  /** Sıfır olan seçenekler gizlensin mi. */
  hideZero?: boolean;
}

/** Seçenek başına sayım: ton noktası + ad + sayı. Ekran okuyucu tek cümle okur. */
export const OptionSummary = memo(function OptionSummary({ options, counts, empty, hideZero }: OptionSummaryProps) {
  const items = options
    .map((o) => ({ option: o, count: counts[o.key] ?? 0 }))
    .filter((i) => !hideZero || i.count > 0);
  const spoken = [
    ...items.map((i) => `${i.option.label} ${i.count}`),
    ...(empty !== undefined ? [`Boş ${empty}`] : []),
  ].join(', ');

  return (
    <View style={styles.wrap} accessible accessibilityRole="summary" accessibilityLabel={spoken}>
      {items.map(({ option, count }) => (
        <View key={option.key} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: tones[option.tone].solid }]} />
          <Text variant="caption" tone="muted" maxFontSizeMultiplier={1.2}>
            {option.label}
          </Text>
          <Text variant="number" maxFontSizeMultiplier={1.2}>
            {count}
          </Text>
        </View>
      ))}
      {empty !== undefined ? (
        <View style={styles.item}>
          <View style={[styles.dot, styles.emptyDot]} />
          <Text variant="caption" tone="muted" maxFontSizeMultiplier={1.2}>
            Boş
          </Text>
          <Text variant="number" maxFontSizeMultiplier={1.2}>
            {empty}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xxs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radii.full },
  emptyDot: { backgroundColor: colors.surface, borderWidth: layout.inputBorder, borderColor: colors.border },
});
