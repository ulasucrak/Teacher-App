import { Pressable, StyleSheet } from 'react-native';

import { colors, iconSize, layout, radii, spacing, strokes, useReducedMotion } from '@/theme';

import { Icon, type IconName } from './Icon';
import { isHovered, webPressFeedback } from './SegmentedChoice.interaction';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
  testID?: string;
}

/** Filtre / etiket çipi (kurşun çerçeveli kare köşe; seçiliyken kurşun dolgu, beyaz yazı). */
export function Chip({ label, selected = false, onPress, icon, accessibilityLabel, testID }: ChipProps) {
  const reducedMotion = useReducedMotion();
  const fg = selected ? colors.textInverse : colors.text;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={4}
      style={(state) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        (state.pressed || (onPress && isHovered(state))) && !selected && styles.pressed,
        onPress && webPressFeedback(state.pressed, reducedMotion),
      ]}
    >
      {icon ? <Icon name={icon} size={iconSize.sm} color={fg} /> : null}
      <Text variant="label" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + spacing.xxs,
    minHeight: layout.buttonHeightSm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.sm,
    borderWidth: strokes.base,
    borderColor: colors.outline,
  },
  selected: { backgroundColor: colors.text },
  unselected: { backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.surfaceMuted },
});
