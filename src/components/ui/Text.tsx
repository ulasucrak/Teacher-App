import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fontScale, typography, type TextVariant } from '@/theme';

export type TextTone = 'default' | 'muted' | 'inverse' | 'primary' | 'danger';

const toneColor: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  inverse: colors.textInverse,
  primary: colors.primary,
  danger: colors.danger,
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Ham renk yerine ton kullanın; yalnızca tema token'ı geçirin. */
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** Uygulamadaki tüm metinler bu bileşenden geçer (font, ölçek, renk). */
export function Text({
  variant = 'body',
  tone = 'default',
  color,
  align,
  style,
  maxFontSizeMultiplier = fontScale.max,
  ...rest
}: TextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[typography[variant], { color: color ?? toneColor[tone] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
