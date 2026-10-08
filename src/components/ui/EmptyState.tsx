import { StyleSheet, View } from 'react-native';

import { layout, spacing } from '@/theme';

import { Button } from './Button';
import type { IconName } from './Icon';
import { IconTile } from './IconTile';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  /** Ne: "Henüz sınıfınız yok". */
  title: string;
  /** Tek cümle: neden boş + nasıl başlanır. */
  description: string;
  /** Ekranın birincil eylemi (sarı). Boş durum eylem gösteriyorsa ekran ayrıca FAB/alt buton göstermez. */
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: IconName;
  actionTestID?: string;
  /** İsteğe bağlı ikinci yol (hafif buton). */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionTestID?: string;
  testID?: string;
}

/** Boş liste: ne + nasıl başlanır. Ortalı, sayfanın üst yarısında, tek birincil eylem. */
export function EmptyState({
  icon = 'book',
  title,
  description,
  actionLabel,
  onAction,
  actionIcon = 'plus',
  actionTestID,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionTestID,
  testID,
}: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <IconTile icon={icon} size="lg" />
      <View style={styles.texts}>
        <Text variant="headline" align="center" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="bodySmall" tone="muted" align="center">
          {description}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} icon={actionIcon} testID={actionTestID} style={styles.action} />
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <Button
          label={secondaryActionLabel}
          onPress={onSecondaryAction}
          variant="ghost"
          fullWidth={false}
          testID={secondaryActionTestID}
          style={styles.secondary}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    alignItems: 'center',
  },
  texts: { gap: spacing.xs + spacing.xxs, maxWidth: layout.readableWidth - spacing.huge * 2, alignItems: 'center' },
  action: { alignSelf: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xxl },
  secondary: { alignSelf: 'center', marginTop: -spacing.sm },
});
