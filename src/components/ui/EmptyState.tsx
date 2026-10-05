import { StyleSheet, View } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  /** Ne: "Henüz sınıfınız yok." */
  title: string;
  /** Neden boş + nasıl başlanır. */
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Boş liste: ne + neden boş + nasıl başlanır. Sola hizalı, sayfanın üst üçte birinde. */
export function EmptyState({ icon = 'book', title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={26} color={colors.primary} />
      </View>
      <View style={styles.texts}>
        <Text variant="heading" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="body" tone="muted">
          {description}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} icon="plus" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.xxxl, gap: spacing.xl, alignItems: 'flex-start' },
  iconBox: {
    width: layout.iconBox,
    height: layout.iconBox,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { gap: spacing.sm, maxWidth: layout.readableWidth },
});
