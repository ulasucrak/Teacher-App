import { SymbolView } from 'expo-symbols';
import androidLight from 'expo-symbols/androidWeights/light';

import { toWebSymbol } from './iconMap';
import type { SymbolIconProps } from './SymbolIcon';

/**
 * Web'de SymbolView Material Symbols yazı tipini kullanır; ağırlık `android` anahtarından okunur.
 * Yazı tipi dolgusuz (FILL 0) çizgi ikonlardır; 300 (Light) çizgi kalınlığı iOS'taki SF Symbols
 * çizgisine en yakın olanıdır (500 belirgin biçimde kalın görünür).
 */
const symbolWeight = { ios: 'medium', android: androidLight } as const;

/** Web sürümü: SF Symbols yok; aynı ikonun Material Symbols karşılığı çizilir. */
export function SymbolIcon({ symbol, size, color, style }: SymbolIconProps) {
  return (
    <SymbolView
      name={toWebSymbol(symbol)}
      size={size}
      tintColor={color}
      weight={symbolWeight}
      style={[{ width: size, height: size }, style]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
