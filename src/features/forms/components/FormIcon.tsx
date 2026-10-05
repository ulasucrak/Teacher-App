import { SymbolView } from 'expo-symbols';
import androidMedium from 'expo-symbols/androidWeights/medium';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { colors, layout, radii } from '@/theme';

type SymbolName = Exclude<ComponentProps<typeof SymbolView>['name'], string>;

/** Ortak ikon setinde olmayan, yalnızca form ekranlarında gereken ikonlar. */
const extraIcons = {
  arrowUp: { ios: 'chevron.up', android: 'expand_less' },
  copy: { ios: 'doc.on.doc', android: 'content_copy' },
  archive: { ios: 'archivebox', android: 'archive' },
  unarchive: { ios: 'arrow.uturn.backward', android: 'unarchive' },
  addFromOther: { ios: 'tray.and.arrow.down', android: 'move_to_inbox' },
  list: { ios: 'list.bullet', android: 'list' },
} satisfies Record<string, SymbolName>;

type ExtraIconName = keyof typeof extraIcons;
export type FormIconName = IconName | ExtraIconName;

function isExtra(name: FormIconName): name is ExtraIconName {
  return name in extraIcons;
}

const symbolWeight = { ios: 'medium', android: androidMedium } as const;

export function FormIcon({ name, size = 22, color = colors.text }: { name: FormIconName; size?: number; color?: string }) {
  if (!isExtra(name)) return <Icon name={name} size={size} color={color} />;
  return (
    <SymbolView
      name={extraIcons[name]}
      size={size}
      tintColor={color}
      weight={symbolWeight}
      style={{ width: size, height: size }}
      accessible={false}
      importantForAccessibility="no"
    />
  );
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
  size = 22,
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
