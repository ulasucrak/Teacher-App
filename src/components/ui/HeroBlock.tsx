import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, hardShadow, paper, radii, spacing, strokes, type PaperName } from '@/theme';

import { StarSticker } from './StarSticker';
import { Tape } from './Tape';
import { Text } from './Text';

export interface HeroBlockProps {
  /** Dev başlık: "5/B". Tek satır, gerekirse küçülür. */
  title: string;
  /** Altındaki kalın satır: "Matematik". */
  subtitle?: string;
  /** Kâğıt rengi (varsayılan `nane`). */
  paper?: PaperName;
  /** Sol üst köşede çapraz bant (renk adı; verilmezse `sari`; `false` bantsız). */
  tape?: PaperName | false;
  /** Sağ üstte büyük yıldız çıkartması. */
  sticker?: boolean;
  /** Alt satır: avatar yığını + `Pill` gibi. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Sınıf kimliği bloğu: renkli el işi kâğıdı üstünde 80 pt sınıf adı (mockup `.hero`). Sınıf ekranının üst
 * kısmı için; bant ve çıkartma süstür, ekran okuyucudan gizlidir. Sayfa kenar boşluğunu üst bileşen verir.
 */
export function HeroBlock({ title, subtitle, paper: paperName = 'nane', tape = 'sari', sticker = false, children, style, testID }: HeroBlockProps) {
  return (
    <View testID={testID} style={[styles.block, { backgroundColor: paper[paperName] }, hardShadow('lg'), style]}>
      {tape ? <Tape paper={tape} rotate={-6} style={styles.tape} /> : null}
      {sticker ? (
        <View style={styles.sticker}>
          <StarSticker size={64} rotate={14} />
        </View>
      ) : null}
      <Text variant="hero" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="bodyStrong" style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
      {children ? <View style={styles.footer}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderRadius: radii.lg,
    borderWidth: strokes.base,
    borderColor: colors.outline,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg + spacing.xxs,
  },
  tape: { top: -8, left: -14, marginLeft: 0, width: 74, height: 22 },
  sticker: { position: 'absolute', right: 10, top: 10 },
  subtitle: { marginTop: spacing.xs + 2, fontSize: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
});
