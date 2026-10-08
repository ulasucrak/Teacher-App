import { StyleSheet, Text as RNText, View } from 'react-native';

import { colors } from '@/theme';

export interface StarStickerProps {
  /** Yıldızın boyutu (pt). Varsayılan 18 (satır içi), büyük çıkartma için 64. */
  size?: number;
  /** Derece cinsinden eğim. */
  rotate?: number;
  /** Dolgu rengi (varsayılan sarı). */
  color?: string;
  /** Kurşun çerçeve çizilsin mi (varsayılan true; damganın içindeki mor yıldızda false). */
  outlined?: boolean;
}

/**
 * Yıldız çıkartması: kurşun çerçeveli sarı yıldız (mockup `stick`). Metin glifiyle çizilir; ek kütüphane yok.
 * Dekoratif — "bugün 3 artı" gibi anlam metinle ayrıca verilmelidir (renk ya da çıkartma tek başına anlam taşımaz).
 */
export function StarSticker({ size = 18, rotate = 0, color = colors.accent, outlined = true }: StarStickerProps) {
  const outline = Math.round(size * 1.28);
  return (
    <View
      style={[styles.box, { width: size, height: size, transform: [{ rotate: `${rotate}deg` }] }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {outlined ? (
        <RNText style={[styles.glyph, { fontSize: outline, lineHeight: outline * 1.1, color: colors.outline }]} allowFontScaling={false}>
          ★
        </RNText>
      ) : null}
      <RNText style={[styles.glyph, { fontSize: Math.round(size * 1.02), lineHeight: size * 1.1, color }]} allowFontScaling={false}>
        ★
      </RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  glyph: { position: 'absolute', textAlign: 'center', includeFontPadding: false },
});
