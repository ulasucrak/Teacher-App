import { SymbolView } from 'expo-symbols';
import androidMedium from 'expo-symbols/androidWeights/medium';

import { toWebSymbol } from './iconMap';
import type { SymbolIconProps } from './SymbolIcon';

/** Web'de SymbolView Material Symbols yazı tipini kullanır; ağırlık `android` anahtarından okunur. */
const symbolWeight = { ios: 'medium', android: androidMedium } as const;

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
