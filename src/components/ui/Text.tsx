import { Platform, Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, fontScale, typography, type TextVariant } from '@/theme';

export type TextTone = 'default' | 'muted' | 'inverse' | 'primary' | 'danger';

const toneColor: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  inverse: colors.textInverse,
  primary: colors.primary,
  danger: colors.danger,
};

/**
 * Web: başlık, etiket ve sayı metinleri çift tıklamada seçilmesin (iOS'ta metin seçilemez).
 * Gövde metni (`body`, `bodySmall`) kopyalanabilir kalır; `selectable` verilirse ona uyulur.
 */
const UNSELECTABLE_ON_WEB: ReadonlySet<TextVariant> = new Set<TextVariant>([
  'display',
  'title',
  'heading',
  'bodyStrong',
  'label',
  'caption',
  'number',
]);

const noSelect: TextStyle = { userSelect: 'none' };

/** Web'de bu varyant varsayılan olarak seçilemez mi? */
export function isUnselectableOnWeb(variant: TextVariant, selectable?: boolean): boolean {
  return selectable === undefined && UNSELECTABLE_ON_WEB.has(variant);
}

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
  selectable,
  ...rest
}: TextProps) {
  const unselectable = Platform.OS === 'web' && isUnselectableOnWeb(variant, selectable);
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      selectable={selectable}
      style={[
        typography[variant],
        { color: color ?? toneColor[tone] },
        align ? { textAlign: align } : null,
        unselectable ? noSelect : null,
        style,
      ]}
      {...rest}
    />
  );
}
