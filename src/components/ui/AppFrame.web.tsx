import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { WEB_MAX_CONTENT_WIDTH } from '@/lib/platform';
import { colors, layout } from '@/theme';

/**
 * Web: telefon için tasarlanmış ekranlar masaüstünde ortada, okunur genişlikte durur.
 * Dar tarayıcılarda (mobil web) tam genişliktir.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  // Kenar çizgisi yalnızca çerçevenin iki yanında boşluk kaldığında (masaüstü) anlamlıdır.
  const framed = width > WEB_MAX_CONTENT_WIDTH;
  return (
    <View style={styles.page}>
      <View style={[styles.frame, framed && styles.framed]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_MAX_CONTENT_WIDTH,
    overflow: 'hidden',
  },
  framed: {
    borderLeftWidth: layout.hairline,
    borderRightWidth: layout.hairline,
    borderColor: colors.rule,
  },
});
