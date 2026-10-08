import { StyleSheet, View } from 'react-native';

import { colors, fontFamilies, radii } from '@/theme';

import { Text } from './Text';

export interface CountBubbleProps {
  /** Sayı ya da kısa metin ("4", "28", "9+"). */
  value: number | string;
  /** Dairenin çapı (varsayılan 30, mockup `.cnt`). */
  size?: number;
  testID?: string;
}

/**
 * Kurşun daire içinde beyaz sayı: bölüm başlığı yanında adet (mockup `.sec .cnt`).
 * Anlam metindedir; sayı bu bileşende ayrıca ekran okuyucuya okunur.
 */
export function CountBubble({ value, size = 30, testID }: CountBubbleProps) {
  return (
    <View
      testID={testID}
      style={[styles.bubble, { width: size, height: size, borderRadius: radii.full, minWidth: size }]}
      accessibilityRole="text"
      accessibilityLabel={String(value)}
    >
      <Text
        color={colors.textInverse}
        maxFontSizeMultiplier={1.2}
        style={{ fontFamily: fontFamilies.displayExtraBold, fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.6) }}
      >
        {String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { backgroundColor: colors.outline, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
