import { Pressable, StyleSheet } from 'react-native';

import { colors, hardShadow, iconSize, layout, pressedIn, radii, spacing, strokes } from '@/theme';

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
 * Yüzen birincil eylem (etiketli yuvarlatılmış dikdörtgen, sarı, kalın çerçeve + sert gölge; mockup `.fab`).
 * Liste ekranlarında başparmağın
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
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: disabled ? colors.surfaceMuted : pressed ? colors.accentPressed : colors.accent },
        disabled ? styles.disabled : pressed ? pressedIn('md') : hardShadow('md'),
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
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.fabHeight,
    paddingLeft: spacing.lg + spacing.xxs,
    paddingRight: spacing.xxl,
    borderRadius: radii.md,
    borderWidth: strokes.base,
    borderColor: colors.outline,
  },
  disabled: { borderColor: colors.border, borderWidth: strokes.thin },
});
