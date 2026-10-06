import { Pressable, StyleSheet } from 'react-native';

import { colors, iconSize, layout, radii, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
  testID?: string;
}

/** Filtre / etiket çipi (hap şeklinde; ton renkli seçenek çiplerinden ayrışır). */
export function Chip({ label, selected = false, onPress, icon, accessibilityLabel, testID }: ChipProps) {
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
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selected : styles.unselected,
        pressed && !selected && styles.pressed,
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
    borderRadius: radii.full,
  },
  selected: { backgroundColor: colors.text },
  unselected: { backgroundColor: colors.surfaceMuted },
  pressed: { backgroundColor: colors.rule },
});
