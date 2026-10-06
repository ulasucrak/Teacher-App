import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, iconSize, layout, radii } from '@/theme';

import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  /** Zorunlu: ekran okuyucu bu adı okur ("Geri", "Diğer seçenekler"). */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  /** `plain`: yalnızca ikon (varsayılan), `tonal`: sıra grisi daire (sheet kapat, satır içi eylem). */
  variant?: 'plain' | 'tonal';
  style?: StyleProp<ViewStyle>;
  testID?: string;
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
  variant = 'plain',
  style,
  testID,
}: IconButtonProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        variant === 'tonal' && styles.tonal,
        pressed && (variant === 'tonal' ? styles.tonalPressed : styles.pressed),
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
  tonal: { backgroundColor: colors.surfaceMuted },
  pressed: { backgroundColor: colors.pressedOverlay },
  tonalPressed: { backgroundColor: colors.rule },
  disabled: { opacity: 0.4 },
});
