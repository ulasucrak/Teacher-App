import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontFamilies, motion, radii, strokes, useReducedMotion } from '@/theme';

import { StarSticker } from './StarSticker';
import { Text } from './Text';

export interface StampProps {
  /** Damganın üst sözcüğü; varsayılan "AFERİN" (Türkçe büyük harfle yazın). */
  word?: string;
  /** Damganın sayısı/metni: "+1". */
  value?: string;
  /** Çap (pt); varsayılan 108 (mockup). İçerik orantılı ölçeklenir. */
  size?: number;
  /** Duruş eğimi (derece); varsayılan -14. */
  rotate?: number;
  /**
   * `true` iken damga yukarıdan inip basılır (380 ms, bir kez). "Hareketi azalt" açıksa animasyon yoktur,
   * damga son hâliyle belirir. Aynı karta yeniden basmak için bileşene yeni bir `key` verin.
   */
  animate?: boolean;
  /** Ekran okuyucu etiketi; verilmezse damga dekoratiftir (sayı başka yerde okunur). */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const FINAL_OPACITY = 0.94;

/**
 * "Aferin" damgası: mor mürekkepli çift halkalı yuvarlak mühür (mockup `.stamp`). Yalnızca ödül/kutlama anı
 * için; başka yerde mor kullanılmaz. Düz View ve metinle çizilir. Çevre kapsayıcıya `position: absolute`
 * ile yerleştirin (örn. `style={{ right: 4, bottom: 2 }}`); dokunmayı engellemez.
 */
export function Stamp({
  word = 'AFERİN',
  value = '+1',
  size = 108,
  rotate = -14,
  animate = false,
  accessibilityLabel,
  style,
  testID,
}: StampProps) {
  const reducedMotion = useReducedMotion();
  const run = animate && !reducedMotion;
  const [progress] = useState(() => new Animated.Value(run ? 0 : 1));

  useEffect(() => {
    if (!run) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: motion.stampMs,
      easing: Easing.bezier(0.2, 0.9, 0.3, 1.25),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [run, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [2.6, 1] });
  const spin = progress.interpolate({ inputRange: [0, 1], outputRange: [`${rotate - 20}deg`, `${rotate}deg`] });
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, FINAL_OPACITY, FINAL_OPACITY] });
  const k = size / 108;

  return (
    <Animated.View
      testID={testID}
      pointerEvents="none"
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[
        styles.outer,
        { width: size, height: size, borderRadius: radii.full, borderWidth: Math.max(3, 5 * k), opacity, transform: [{ rotate: spin }, { scale }] },
        style,
      ]}
    >
      <View style={[styles.inner, { top: 5 * k, left: 5 * k, right: 5 * k, bottom: 5 * k, borderRadius: radii.full, borderWidth: strokes.thin }]} />
      <View style={styles.content}>
        <Text
          color={colors.stamp}
          maxFontSizeMultiplier={1}
          style={{ fontFamily: fontFamilies.textExtraBold, fontSize: Math.round(13 * k), lineHeight: Math.round(14 * k), letterSpacing: 13 * k * 0.14 }}
        >
          {word}
        </Text>
        <Text
          color={colors.stamp}
          maxFontSizeMultiplier={1}
          style={{ fontFamily: fontFamilies.displayExtraBold, fontSize: Math.round(30 * k), lineHeight: Math.round(32 * k), letterSpacing: -0.6 }}
        >
          {value}
        </Text>
        <StarSticker size={Math.round(16 * k)} color={colors.stamp} outlined={false} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.stamp,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  inner: { position: 'absolute', borderColor: colors.stamp },
  content: { alignItems: 'center', justifyContent: 'center', gap: 2 },
});
