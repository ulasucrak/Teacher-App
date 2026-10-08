import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing, strokes, tones, type ToneName } from '@/theme';

interface ToneDotProps {
  /** Seçeneğin tonu; yoksa (kaldırılmış seçenek) soluk nokta. */
  tone: ToneName | null | undefined;
  /** Soluk görünüm (geri alınmış / silinmiş işlem). */
  dim?: boolean;
  testID?: string;
}

/**
 * Ton noktası: ton dolgusu + ince kurşun çerçeve (mockup'un çıkartma dili). Renk yalnızca destektir;
 * anlam yanındaki metinde (ve ekran okuyucuda) taşınır, bu yüzden dekoratiftir.
 */
export function ToneDot({ tone, dim = false, testID }: ToneDotProps) {
  const fill = tone && !dim ? tones[tone].solid : colors.surfaceMuted;
  return (
    <View
      style={[styles.dot, { backgroundColor: fill, borderColor: tone && !dim ? colors.outline : colors.border }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  dot: { width: spacing.md, height: spacing.md, borderRadius: radii.full, borderWidth: strokes.fine },
});
