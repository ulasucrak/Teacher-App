import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, iconSize, layout, radii, spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * - `primary`: sarı kalem — ekrandaki TEK ana eylem.
 * - `secondary`: sıra grisi — yan eylem ("Tekrar dene", "Vazgeç").
 * - `ghost`: mavi metin — bağlantı gibi hafif eylem ("Şifremi unuttum").
 * - `destructive`: kırmızı — yalnızca onay adımında ("Sınıfı sil").
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
  accessibilityHint?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface VariantColors {
  bg: string;
  bgPressed: string;
  fg: string;
}

const variantColors: Record<ButtonVariant, VariantColors> = {
  primary: { bg: colors.accent, bgPressed: colors.accentPressed, fg: colors.onAccent },
  secondary: { bg: colors.surfaceMuted, bgPressed: colors.rule, fg: colors.text },
  ghost: { bg: 'transparent', bgPressed: colors.pressedOverlay, fg: colors.primary },
  destructive: { bg: colors.danger, bgPressed: colors.dangerPressed, fg: colors.textInverse },
};

const disabledColors: Record<ButtonVariant, VariantColors> = {
  primary: { bg: colors.surfaceMuted, bgPressed: colors.surfaceMuted, fg: colors.textMuted },
  destructive: { bg: colors.surfaceMuted, bgPressed: colors.surfaceMuted, fg: colors.textMuted },
  secondary: { bg: colors.surfaceMuted, bgPressed: colors.surfaceMuted, fg: colors.textMuted },
  ghost: { bg: 'transparent', bgPressed: 'transparent', fg: colors.textMuted },
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
  accessibilityHint,
  accessibilityLabel,
  style,
  testID,
}: ButtonProps) {
  const inactive = disabled || loading;
  const palette = disabled ? disabledColors[variant] : variantColors[variant];

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
          style={styles.label}
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
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { flexShrink: 1 },
});
