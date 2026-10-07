import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { isHovered } from '@/lib/platform';
import { colors, layout, radii, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** `outlined`: beyaz + ince çizgi (varsayılan), `muted`: sıra grisi zemin, kenarsız. */
  variant?: 'outlined' | 'muted';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Seviye 2 yüzey: gerçekten birlikte okunan içerik için (örn. "Tümü" toplu işaretleme).
 * Sayfayı kartlara bölmeyin; liste için `ListRow`, giriş noktası için `ListRow` + `IconTile`.
 */
export function Card({
  children,
  variant = 'outlined',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) {
  const base = [styles.card, variant === 'muted' ? styles.muted : styles.outlined, style];
  if (!onPress) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={(state) => [
        ...base,
        !state.pressed && isHovered(state) && (variant === 'muted' ? styles.hoveredMuted : styles.hovered),
        state.pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.md, padding: spacing.lg },
  outlined: { backgroundColor: colors.surface, borderWidth: layout.hairline, borderColor: colors.rule },
  muted: { backgroundColor: colors.surfaceMuted },
  pressed: { backgroundColor: colors.rule },
  /** Yalnızca web (fare). */
  hovered: { backgroundColor: colors.surfaceMuted },
  hoveredMuted: { filter: 'brightness(0.98)' },
});
