import { StyleSheet, View } from 'react-native';

import { fontFamilies, radii, spacing, tones, type ToneName } from '@/theme';

import { Text } from './Text';

export interface BadgeProps {
  label: string;
  tone?: ToneName;
  testID?: string;
}

/**
 * Küçük durum rozeti ("Taslak", "3 kaydedilmedi"). Satırda en fazla bir rozet;
 * olağan durum için rozet koymayın (örn. "Yayında" değil, yalnızca "Taslak").
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
      <Text variant="caption" color={t.onSoft} style={styles.text} numberOfLines={1}>
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
    borderRadius: radii.full,
  },
  text: { fontFamily: fontFamilies.textSemiBold },
});
