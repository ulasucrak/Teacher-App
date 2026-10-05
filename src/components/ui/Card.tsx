import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** `outlined`: beyaz + ince çizgi (varsayılan), `muted`: satır grisi zemin. */
  variant?: 'outlined' | 'muted';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Seviye 2 yüzey: gruplanmış içerik. Liste satırları için `ListRow` kullanın. */
export function Card({ children, variant = 'outlined', onPress, accessibilityLabel, accessibilityHint, style }: CardProps) {
  const base = [styles.card, variant === 'muted' ? styles.muted : styles.outlined, style];
  if (!onPress) {
    return <View style={base}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [...base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.md, padding: spacing.lg },
  outlined: { backgroundColor: colors.surface, borderWidth: layout.hairline, borderColor: colors.rule },
  muted: { backgroundColor: colors.surfaceMuted },
  pressed: { backgroundColor: colors.surfaceMuted },
});
