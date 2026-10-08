import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, strokes } from '@/theme';

import { Text } from './Text';

export interface PillProps {
  label: string;
  /** `ink`: kurşun hap + beyaz yazı (mockup `.blackpill`, varsayılan). `paper`: beyaz hap + kurşun çerçeve. */
  tone?: 'ink' | 'paper';
  testID?: string;
}

/** Kısa özet hapı: "28 öğrenci", "11 işaret". Etkileşimsiz; tek satır. */
export function Pill({ label, tone = 'ink', testID }: PillProps) {
  const ink = tone === 'ink';
  return (
    <View testID={testID} style={[styles.pill, ink ? styles.ink : styles.paper]} accessibilityRole="text" accessibilityLabel={label}>
      <Text variant="label" color={ink ? colors.textInverse : colors.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: radii.full, paddingHorizontal: spacing.md + spacing.xxs, paddingVertical: spacing.xs + 2 },
  ink: { backgroundColor: colors.outline, borderWidth: strokes.base, borderColor: colors.outline },
  paper: { backgroundColor: colors.surface, borderWidth: strokes.base, borderColor: colors.outline },
});
