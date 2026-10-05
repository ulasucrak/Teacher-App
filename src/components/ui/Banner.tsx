import { StyleSheet, View } from 'react-native';

import { radii, spacing, tones, type ToneName } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BannerKind = 'info' | 'success' | 'warning' | 'error';

const kindTone: Record<BannerKind, ToneName> = {
  info: 'neutral',
  success: 'positive',
  warning: 'warning',
  error: 'negative',
};

const kindIcon: Record<BannerKind, IconName> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

export interface BannerProps {
  kind?: BannerKind;
  title?: string;
  message: string;
}

/** Satır içi bilgi / hata bandı. Hata: ne oldu + nasıl düzelir. */
export function Banner({ kind = 'info', title, message }: BannerProps) {
  const t = tones[kindTone[kind]];
  return (
    <View
      style={[styles.banner, { backgroundColor: t.soft }]}
      accessibilityRole={kind === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
    >
      <Icon name={kindIcon[kind]} size={20} color={t.onSoft} />
      <View style={styles.texts}>
        {title ? (
          <Text variant="label" color={t.onSoft}>
            {title}
          </Text>
        ) : null}
        <Text variant="bodySmall">
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.sm,
  },
  texts: { flex: 1, gap: spacing.xxs },
});
