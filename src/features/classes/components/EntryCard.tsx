import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName } from '@/components/ui';
import { colors, layout, radii, spacing, tones } from '@/theme';

export interface EntryCardProps {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
  accessibilityHint?: string;
  /** `primary`: beyaz kart + mavi ikon; `muted`: satır grisi zemin. */
  variant?: 'primary' | 'muted';
}

/** Sınıf ayrıntısındaki büyük giriş noktası (Formlar, Fotoğraftan öğrenci ekle). */
export function EntryCard({ icon, title, description, onPress, accessibilityHint, variant = 'primary' }: EntryCardProps) {
  return (
    <Card
      variant={variant === 'muted' ? 'muted' : 'outlined'}
      onPress={onPress}
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint={accessibilityHint}
      style={styles.card}
    >
      <View style={[styles.iconBox, variant === 'muted' ? styles.iconBoxMuted : styles.iconBoxPrimary]}>
        <Icon name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="muted">
          {description}
        </Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.textMuted} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: layout.minTouch + spacing.xxl },
  iconBox: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxPrimary: { backgroundColor: tones.neutral.soft },
  iconBoxMuted: { backgroundColor: colors.surface },
  texts: { flex: 1, gap: spacing.xxs },
});
