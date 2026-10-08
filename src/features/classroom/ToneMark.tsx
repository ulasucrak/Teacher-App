import { StyleSheet, View } from 'react-native';

import { radii } from '@/theme';
import type { ToneName } from '@/theme';

interface ToneMarkProps {
  tone: ToneName;
  color: string;
  size: number;
}

/**
 * Tonun şekli — renk görülmese de (projektör soldurması, renk körlüğü) ayırt edilir:
 * olumlu "+", olumsuz "−", uyarı "!", nötr "○". Çizgiyle çizilir (yazı tipine bağlı değil);
 * yanındaki etiket anlamı taşıdığı için ekran okuyucudan gizlidir.
 */
export function ToneMark({ tone, color, size }: ToneMarkProps) {
  const stroke = Math.max(2, Math.round(size / 6));
  const bar = { backgroundColor: color, borderRadius: stroke / 2 };
  return (
    <View
      style={[styles.box, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`tone-mark-${tone}`}
    >
      {tone === 'positive' || tone === 'negative' ? (
        <View style={[bar, { width: size - stroke, height: stroke }]} />
      ) : null}
      {tone === 'positive' ? (
        <View style={[bar, styles.cross, { width: stroke, height: size - stroke }]} />
      ) : null}
      {tone === 'warning' ? (
        <>
          <View style={[bar, { width: stroke, height: size - stroke * 3 }]} />
          <View style={[bar, { width: stroke, height: stroke, marginTop: stroke }]} />
        </>
      ) : null}
      {tone === 'neutral' ? (
        <View
          style={{ width: size - stroke, height: size - stroke, borderRadius: radii.full, borderWidth: stroke, borderColor: color }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  cross: { position: 'absolute' },
});
