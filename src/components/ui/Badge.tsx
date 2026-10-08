import { StyleSheet, View } from 'react-native';

import { colors, fontFamilies, radii, spacing, strokes, tones, type ToneName } from '@/theme';

import { Text } from './Text';

export interface BadgeProps {
  label: string;
  tone?: ToneName;
  testID?: string;
}

/**
 * Küçük durum rozeti ("Taslak", "Birikimli"): ton kâğıdı + ince kurşun çerçeve, kalın yazı.
 * Satırda en fazla bir rozet; olağan durum için rozet koymayın (örn. "Yayında" değil, yalnızca "Taslak").
 */
export function Badge({ label, tone = 'neutral', testID }: BadgeProps) {
  const t = tones[tone];
  return (
    <View
      testID={testID}
      style={[styles.badge, { backgroundColor: t.soft }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text variant="caption" color={colors.text} style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.xs,
    borderWidth: strokes.fine,
    borderColor: colors.outline,
  },
  text: { fontFamily: fontFamilies.textExtraBold, fontSize: 13, lineHeight: 18 },
});
