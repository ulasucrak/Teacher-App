import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, layout, spacing } from '@/theme';

const LINE_GAP = spacing.xxxl;

/**
 * Çizgili defter sayfası: soluk mavi satırlar + kırmızı kenar çizgisi.
 * Yalnızca giriş/kayıt ekranlarının zemini (tasarımın tek "cesur" öğesi).
 */
export function RuledPaper() {
  const [height, setHeight] = useState(0);
  const count = Math.ceil(height / LINE_GAP);

  return (
    <View
      style={styles.paper}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.line, { top: (i + 1) * LINE_GAP }]} />
      ))}
      <View style={styles.margin} />
    </View>
  );
}

/** Kenar çizgisinin soldan konumu; içerik bunun sağına hizalanır. */
export const RULED_MARGIN_X = layout.pageX + layout.numberColumn;

const styles = StyleSheet.create({
  paper: { ...StyleSheet.absoluteFill, backgroundColor: colors.background },
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: layout.hairline,
    backgroundColor: colors.rule,
  },
  margin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: RULED_MARGIN_X - spacing.md,
    width: layout.marginRuleWidth,
    backgroundColor: colors.marginRule,
  },
});
