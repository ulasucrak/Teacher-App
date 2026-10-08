import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { WEB_MAX_CONTENT_WIDTH } from '@/lib/platform';
import { colors, palette, radii, spacing, strokes } from '@/theme';

/**
 * Web: telefon için tasarlanmış ekranlar masaüstünde ortada, okunur genişlikte durur.
 * Geniş tarayıcıda "defter masası" görünümü: noktalı zemin üstünde kalın kurşun çerçeveli, sağa sert
 * gölgeli bir kâğıt sütun (mockup `.dotbg` + `.sheet`). Dar tarayıcılarda (mobil web) tam genişliktir.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  // Çerçeve yalnızca iki yanında boşluk kaldığında (masaüstü) anlamlıdır.
  const framed = width > WEB_MAX_CONTENT_WIDTH;
  return (
    <View style={[styles.page, framed && styles.desk]}>
      <View style={[styles.frame, framed && styles.framed]}>{children}</View>
    </View>
  );
}

// Noktalı zemin: düz renkli noktalar (degrade değil, tekrar eden desen). RN tipinde olmadığı için nesne olarak verilir.
const dots = {
  backgroundImage: `radial-gradient(${palette.defterNokta} 1.3px, transparent 1.4px)`,
  backgroundSize: '24px 24px',
} as object;

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  desk: {
    backgroundColor: palette.defter,
    paddingTop: spacing.xxl,
    ...dots,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_CONTENT_WIDTH,
    overflow: 'hidden',
  },
  framed: {
    backgroundColor: colors.background,
    borderWidth: strokes.base,
    borderBottomWidth: 0,
    borderColor: colors.outline,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    // Yalnızca sağa sert gölge: mockup `6px 0 0`.
    boxShadow: `6px 0px 0px ${colors.outline}`,
  },
});
