import { StyleSheet, View } from 'react-native';

import { colors, iconSize, radii, spacing, strokes, tones, type ToneName } from '@/theme';

import { Button } from './Button';
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
  /** İsteğe bağlı tek eylem ("Tekrar dene"); banner'ın içinde, metnin altında. */
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
  testID?: string;
}

/** Satır içi bilgi / hata bandı: ton kâğıdı + kurşun çerçeve, kurşun yazı. Hata: ne oldu + nasıl düzelir. */
export function Banner({ kind = 'info', title, message, actionLabel, onAction, actionTestID, testID }: BannerProps) {
  const t = tones[kindTone[kind]];
  return (
    <View
      testID={testID}
      style={[styles.banner, { backgroundColor: t.soft }]}
      accessibilityRole={kind === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
    >
      <Icon name={kindIcon[kind]} size={iconSize.lg} color={colors.text} />
      <View style={styles.texts}>
        {title ? (
          <Text variant="bodyStrong">
            {title}
          </Text>
        ) : null}
        <Text variant="bodySmall">{message}</Text>
        {actionLabel && onAction ? (
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="secondary"
            size="sm"
            fullWidth={false}
            style={styles.action}
            testID={actionTestID}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md + spacing.xxs,
    borderRadius: radii.sm,
    borderWidth: strokes.base,
    borderColor: colors.outline,
  },
  texts: { flex: 1, gap: spacing.xxs },
  action: { marginTop: spacing.sm },
});
