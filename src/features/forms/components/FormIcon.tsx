import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, SymbolIcon, type IconName } from '@/components/ui';
import { colors, iconSize, layout, radii } from '@/theme';

import { extraIcons } from './formIconMap';

type ExtraIconName = keyof typeof extraIcons;
export type FormIconName = IconName | ExtraIconName;

function isExtra(name: FormIconName): name is ExtraIconName {
  return name in extraIcons;
}

export function FormIcon({ name, size = iconSize.xl, color = colors.text }: { name: FormIconName; size?: number; color?: string }) {
  if (!isExtra(name)) return <Icon name={name} size={size} color={color} />;
  return <SymbolIcon symbol={extraIcons[name]} size={size} color={color} />;
}

interface FormIconButtonProps {
  icon: FormIconName;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** `IconButton` ile aynı 48 pt alan; genişletilmiş ikon setiyle. */
export function FormIconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  color = colors.text,
  size = iconSize.xl,
  style,
}: FormIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <FormIcon name={icon} size={size} color={color} />
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
  disabled: { opacity: 0.35 },
});
