import { Pressable, StyleSheet } from 'react-native';

import { isHovered, isWeb } from '@/lib/platform';
import { colors, elevation, iconSize, layout, radii, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface FabProps {
  /** Her zaman görünür etiket: "Yeni sınıf". Yalnız ikonlu FAB yok. */
  label: string;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Yüzen birincil eylem (etiketli hap, sarı kalem). Liste ekranlarında başparmağın
 * altında durur. `Screen`'in `fab` prop'una verin; aynı ekranda `footer` kullanmayın.
 */
export function Fab({ label, onPress, icon = 'plus', disabled = false, accessibilityHint, testID }: FabProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={(state) => [
        styles.fab,
        { backgroundColor: disabled ? colors.surfaceMuted : state.pressed ? colors.accentPressed : colors.accent },
        // Web: üstüne gelince hafif koyulaşır, basınca hafifçe küçülür (iOS'taki dokunma hissi).
        !disabled && !state.pressed && isHovered(state) && styles.hovered,
        !disabled && isWeb && state.pressed && styles.webPressed,
      ]}
    >
      <Icon name={icon} size={iconSize.lg} color={disabled ? colors.textMuted : colors.onAccent} />
      <Text variant="bodyStrong" color={disabled ? colors.textMuted : colors.onAccent} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hovered: { filter: 'brightness(0.96)' },
  webPressed: { transform: [{ scale: 0.97 }] },
  fab: {
    ...elevation.floating,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.fabHeight,
    paddingLeft: spacing.xl,
    paddingRight: spacing.xxl,
    borderRadius: radii.full,
  },
});
