import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, hardShadow, layout, paper, pressedIn, radii, spacing, type PaperName, type ShadowSize } from '@/theme';

import { Tape } from './Tape';

export interface CardProps {
  children: ReactNode;
  /**
   * `outlined`: beyaz kâğıt + kalın kurşun çerçeve + sert gölge (varsayılan),
   * `muted`: sıra grisi zemin + ince kurşun çerçeve, gölgesiz,
   * `paper`: renkli el işi kâğıdı (`paper` ile renk) + kalın çerçeve + büyük gölge.
   */
  variant?: 'outlined' | 'muted' | 'paper';
  /** `variant="paper"` için kâğıt rengi (varsayılan `nane`). */
  paper?: PaperName;
  /** Kartın üstüne bantlanmış renkli şerit (yalnızca süs; ekran okuyucudan gizli). */
  tape?: PaperName;
  /** Bant eğimi (derece); bkz. `tapeRotation(index)`. */
  tapeRotate?: number;
  /** Sert gölge boyutu; varsayılan: `paper` için `lg` (5), diğerleri `sm` (3). */
  shadowSize?: ShadowSize;
  /** Sert gölge rengi: `ink` (kurşun, varsayılan) ya da `board` (mavi pano üstünde koyu mavi). */
  shadowOn?: 'ink' | 'board';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Seviye 2 yüzey: gerçekten birlikte okunan içerik için (örn. "Tümü" toplu işaretleme).
 * Sayfayı kartlara bölmeyin; liste için `ListRow`, giriş noktası için `ListRow variant="card"`.
 * Bantlı kâğıt kart için `PaperCard`.
 */
export function Card({
  children,
  variant = 'outlined',
  paper: paperName = 'nane',
  tape,
  tapeRotate,
  shadowSize,
  shadowOn = 'ink',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: CardProps) {
  const size: ShadowSize = shadowSize ?? (variant === 'paper' ? 'lg' : 'sm');
  const shadowColor = shadowOn === 'board' ? colors.boardDeep : colors.shadow;
  const surface = [
    styles.card,
    variant === 'muted' ? styles.muted : styles.outlined,
    variant === 'paper' && { backgroundColor: paper[paperName] },
  ];
  const tapeEl = tape ? <Tape paper={tape} rotate={tapeRotate} /> : null;

  if (!onPress) {
    return (
      <View style={[...surface, variant !== 'muted' && hardShadow(size, shadowColor), style]} testID={testID}>
        {tapeEl}
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        ...surface,
        variant !== 'muted' && (pressed ? pressedIn(size) : hardShadow(size, shadowColor)),
        style,
      ]}
    >
      {tapeEl}
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.md, padding: spacing.lg },
  outlined: { backgroundColor: colors.surface, borderWidth: layout.stroke, borderColor: colors.outline },
  muted: { backgroundColor: colors.surfaceMuted, borderWidth: layout.hairline, borderColor: colors.outline },
});
