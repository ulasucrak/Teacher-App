import { createContext, useContext } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, hardShadow, iconSize, layout, pressedIn, radii, strokes } from '@/theme';

import { Icon, type IconName } from './Icon';

export type IconButtonVariant = 'plain' | 'tonal' | 'square';

/**
 * Üst çubuk içinde (`Screen`) ikon düğmeleri, ekranlar değişmeden kare "pul" görünümü alır
 * (mockup `.sq`). Değeri bu bağlam taşır; açıkça verilen `variant` her zaman önceliklidir.
 */
export const IconButtonVariantContext = createContext<IconButtonVariant>('plain');

export interface IconButtonProps {
  icon: IconName;
  /** Zorunlu: ekran okuyucu bu adı okur ("Geri", "Diğer seçenekler"). */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  color?: string;
  size?: number;
  disabled?: boolean;
  /**
   * `plain`: yalnızca ikon (varsayılan; alan içi düğmeler), `tonal`: sıra grisi küçük kare çerçeveli
   * (sheet kapat, satır içi eylem), `square`: beyaz 46 pt kare + kalın çerçeve + sert gölge (üst çubuk).
   */
  variant?: IconButtonVariant;
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
  variant,
  style,
  testID,
}: IconButtonProps) {
  const inherited = useContext(IconButtonVariantContext);
  const kind = variant ?? inherited;
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
        kind === 'tonal' && styles.tonal,
        kind === 'square' && styles.square,
        kind === 'square' && (pressed ? pressedIn('xs') : hardShadow('xs')),
        pressed && (kind === 'tonal' ? styles.tonalPressed : kind === 'plain' ? styles.pressed : styles.squarePressed),
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
    borderRadius: radii.sm,
  },
  tonal: {
    width: layout.minTouch - 4,
    height: layout.minTouch - 4,
    backgroundColor: colors.surfaceMuted,
    borderWidth: strokes.thin,
    borderColor: colors.outline,
  },
  square: {
    width: layout.squareButton,
    height: layout.squareButton,
    backgroundColor: colors.surface,
    borderWidth: strokes.base,
    borderColor: colors.outline,
  },
  pressed: { backgroundColor: colors.pressedOverlay },
  tonalPressed: { backgroundColor: colors.rule },
  squarePressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.4 },
});
