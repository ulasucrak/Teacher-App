import { StyleSheet, View } from 'react-native';

import { colors, layout } from '@/theme';

/**
 * @deprecated v1 "çizgili defter" zemini. v2'de dekoratif çizgi yok (docs/DESIGN_V2.md);
 * bileşen geriye uyumluluk için düz kâğıt zemini çizer. Yeni kodda kullanmayın.
 */
export function RuledPaper() {
  return (
    <View
      style={styles.paper}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    />
  );
}

/** @deprecated v1 kenar çizgisi konumu; v2'de sayfa boşluğuna eşittir. */
export const RULED_MARGIN_X = layout.pageX;

const styles = StyleSheet.create({
  paper: { ...StyleSheet.absoluteFill, backgroundColor: colors.background },
});
