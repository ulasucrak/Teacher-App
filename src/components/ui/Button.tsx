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
  border?: string;
}

const variantColors: Record<ButtonVariant, VariantColors> = {
  primary: { bg: colors.primary, bgPressed: colors.primaryPressed, fg: colors.textInverse },
  secondary: {
    bg: colors.surface,
    bgPressed: colors.surfaceMuted,
    fg: colors.primary,
    border: colors.primary,
  },
  ghost: { bg: 'transparent', bgPressed: colors.pressedOverlay, fg: colors.primary },
  destructive: { bg: colors.danger, bgPressed: colors.dangerPressed, fg: colors.textInverse },
};

const disabledColors: Record<ButtonVariant, VariantColors> = {
  primary: { bg: colors.primaryMuted, bgPressed: colors.primaryMuted, fg: colors.primaryMutedText },
  destructive: { bg: colors.surfaceMuted, bgPressed: colors.surfaceMuted, fg: colors.textMuted },
  secondary: {
    bg: colors.surface,
    bgPressed: colors.surface,
    fg: colors.textMuted,
    border: colors.rule,
  },
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
        {
          backgroundColor: pressed ? palette.bgPressed : palette.bg,
          borderColor: palette.border ?? 'transparent',
          borderWidth: palette.border ? layout.inputBorder : 0,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.fg} accessibilityElementsHidden />
        ) : icon ? (
          <Icon name={icon} size={size === 'sm' ? iconSize.md : iconSize.lg} color={palette.fg} />
        ) : null}
        <Text variant={size === 'md' ? 'bodyStrong' : 'label'} color={palette.fg} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  md: { minHeight: layout.buttonHeight },
  sm: { minHeight: layout.buttonHeightSm, paddingHorizontal: spacing.lg },
  full: { alignSelf: 'stretch' },
  inline: { alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
