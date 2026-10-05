import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, iconSize, layout, radii } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  /** Zorunlu: ekran okuyucu bu adı okur ("Geri", "Ara"). */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** 48 pt dokunma alanlı ikon butonu. */
export function IconButton({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  color = colors.text,
  size = iconSize.xl,
  disabled = false,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  pressed: { backgroundColor: colors.pressedOverlay },
  disabled: { opacity: 0.4 },
});
