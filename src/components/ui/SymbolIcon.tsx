import { SymbolView } from 'expo-symbols';
import androidMedium from 'expo-symbols/androidWeights/medium';
import type { StyleProp, ViewStyle } from 'react-native';

import type { SymbolName } from './iconMap';

/** Android `weight` dizesini yok sayar; Material Symbols ağırlığı ayrıca verilmeli. */
const symbolWeight = { ios: 'medium', android: androidMedium } as const;

export interface SymbolIconProps {
  symbol: SymbolName;
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

/** Platform sembolünü çizen alt düzey bileşen; doğrudan `Icon` / `FormIcon` kullanın. */
export function SymbolIcon({ symbol, size, color, style }: SymbolIconProps) {
  return (
    <SymbolView
      name={symbol}
      size={size}
      tintColor={color}
      weight={symbolWeight}
      style={[{ width: size, height: size }, style]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
