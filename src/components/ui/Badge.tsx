import { StyleSheet, View } from 'react-native';

import { fontFamilies, radii, spacing, tones, type ToneName } from '@/theme';

import { Text } from './Text';

export interface BadgeProps {
  label: string;
  tone?: ToneName;
}

/** Küçük durum rozeti ("Yayında", "Taslak"). */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.soft }]} accessibilityRole="text" accessibilityLabel={label}>
      <View style={[styles.dot, { backgroundColor: t.onSoft }]} />
      <Text variant="caption" color={t.onSoft} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.xs,
  },
  dot: { width: 6, height: 6, borderRadius: radii.full },
  text: { fontFamily: fontFamilies.textSemiBold },
});
