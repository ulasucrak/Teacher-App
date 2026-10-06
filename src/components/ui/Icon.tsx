import type { StyleProp, ViewStyle } from 'react-native';

import { colors, iconSize } from '@/theme';

import { icons, type IconName } from './iconMap';
import { SymbolIcon } from './SymbolIcon';

export type { IconName } from './iconMap';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Dekoratif ikon; anlam taşıyorsa çevresindeki dokunulabilir öğeye etiket verin. */
export function Icon({ name, size = iconSize.xl, color = colors.text, style }: IconProps) {
  return <SymbolIcon symbol={icons[name]} size={size} color={color} style={style} />;
}
