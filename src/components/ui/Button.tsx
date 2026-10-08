import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, hardShadow, iconSize, layout, pressedIn, radii, spacing, strokes } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * - `primary`: sarı — ekrandaki TEK ana eylem (kalın kurşun çerçeve + sert gölge).
 * - `secondary`: beyaz kâğıt + kurşun çerçeve + küçük gölge — yan eylem ("Tekrar dene", "Vazgeç", "+ Form").
 * - `ghost`: çerçevesiz pano-mavisi metin — bağlantı gibi hafif eylem ("Şifremi unuttum").
 * - `destructive`: mercan dolgu + kurşun metin — yalnızca onay adımında ("Sınıfı sil").
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps {
  /** Fiil + nesne: "Yoklamayı kaydet", "Giriş yap". */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** Varsayılan: true (formlarda ve alt çubukta tam genişlik). */
  fullWidth?: boolean;
  size?: 'md' | 'sm';
  /**
   * `ghost` / `secondary` için kırmızı metin ve ikon: onaya götüren yıkıcı giriş eylemi
   * ("Hesabımı sil"). Asıl kırmızı dolgu (`destructive`) yalnızca onay adımında kalır.
   */
  danger?: boolean;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface VariantColors {
  bg: string;
  bgPressed: string;
  fg: string;
  /** Çerçeve + gölge var mı (ghost ve devre dışı: yok). */
  boxed: boolean;
}

const variantColors: Record<ButtonVariant, VariantColors> = {
  primary: { bg: colors.accent, bgPressed: colors.accentPressed, fg: colors.onAccent, boxed: true },
  secondary: { bg: colors.surface, bgPressed: colors.surfaceMuted, fg: colors.text, boxed: true },
  ghost: { bg: 'transparent', bgPressed: colors.pressedOverlay, fg: colors.primary, boxed: false },
  destructive: { bg: colors.dangerSolid, bgPressed: colors.dangerSolidPressed, fg: colors.onDangerSolid, boxed: true },
};

const disabledColors: Record<ButtonVariant, VariantColors> = {
  primary: { bg: colors.surfaceMuted, bgPressed: colors.surfaceMuted, fg: colors.textMuted, boxed: false },
  destructive: { bg: colors.surfaceMuted, bgPressed: colors.surfaceMuted, fg: colors.textMuted, boxed: false },
  secondary: { bg: colors.surfaceMuted, bgPressed: colors.surfaceMuted, fg: colors.textMuted, boxed: false },
  ghost: { bg: 'transparent', bgPressed: 'transparent', fg: colors.textMuted, boxed: false },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
  danger = false,
  accessibilityHint,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const base = disabled ? disabledColors[variant] : variantColors[variant];
  const palette = danger && !disabled && (variant === 'ghost' || variant === 'secondary') ? { ...base, fg: colors.danger } : base;
  // Birincil/yıkıcı büyük gölge; ikincil ve küçük düğmeler bir kademe hafif.
  const shadow = variant === 'secondary' || size === 'sm' ? 'sm' : 'md';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth ? styles.full : styles.inline,
        { backgroundColor: pressed ? palette.bgPressed : palette.bg },
        palette.boxed ? styles.boxed : disabled && variant !== 'ghost' ? styles.disabledBox : null,
        // Basınca "gömülme": gölge kapanır, düğme gölgenin yerine oturur.
        palette.boxed ? (pressed ? pressedIn(shadow) : hardShadow(shadow)) : null,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.fg} accessibilityElementsHidden />
        ) : icon ? (
          <Icon name={icon} size={size === 'sm' ? iconSize.md : iconSize.lg} color={palette.fg} />
        ) : null}
        <Text
          variant={size === 'md' ? 'bodyStrong' : 'label'}
          color={palette.fg}
          numberOfLines={1}
          style={[styles.label, variant === 'ghost' && styles.ghostLabel]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  md: { minHeight: layout.buttonHeight, borderRadius: radii.md },
  sm: { minHeight: layout.buttonHeightSm, borderRadius: radii.sm, paddingHorizontal: spacing.md },
  full: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  boxed: { borderWidth: strokes.base, borderColor: colors.outline },
  // Devre dışı: düz, gölgesiz; soluk çerçeve — "basılamaz" okunur.
  disabledBox: { borderWidth: strokes.thin, borderColor: colors.border },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { flexShrink: 1 },
  ghostLabel: { textDecorationLine: 'underline' },
});
