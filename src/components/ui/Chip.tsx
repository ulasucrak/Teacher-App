import { Pressable, StyleSheet } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/** Filtre / etiket çipi (hap şeklinde; seçenek çiplerinden ayrışır). */
export function Chip({ label, selected = false, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && !selected && styles.pressed,
      ]}
    >
      <Text variant="label" color={selected ? colors.textInverse : colors.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: layout.buttonHeightSm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.hairline,
  },
  selected: { backgroundColor: colors.text, borderColor: colors.text },
  unselected: { backgroundColor: colors.surface, borderColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
});
