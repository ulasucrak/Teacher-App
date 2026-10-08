import type { TextProps, TextStyle } from 'react-native';

export interface FitTextOptions {
  /** Kapalıysa metin olduğu gibi kalır (taşarsa "…"). */
  enabled?: boolean;
  /** En fazla ne kadar küçülsün (0.8 → %80). */
  minimumFontScale: number;
}

export interface FitTextResult {
  /** `Text`'e yayılacak prop'lar. */
  textProps: Partial<TextProps>;
  /** Web'de ölçülen küçültülmüş boyut; yerelde her zaman `undefined`. */
  style: TextStyle | undefined;
}

/**
 * Tek satırlık etiketi sığdırır. Yerelde (iOS/Android) RN'nin kendi
 * `adjustsFontSizeToFit`'i kullanılır; web karşılığı `fitText.web.ts`'de.
 */
export function useFitText(_text: string, { enabled = true, minimumFontScale }: FitTextOptions): FitTextResult {
  return {
    textProps: enabled ? { adjustsFontSizeToFit: true, minimumFontScale } : {},
    style: undefined,
  };
}
