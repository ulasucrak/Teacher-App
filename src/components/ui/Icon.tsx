import { SymbolView } from 'expo-symbols';
import androidMedium from 'expo-symbols/androidWeights/medium';
import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, iconSize } from '@/theme';

type SymbolName = Exclude<ComponentProps<typeof SymbolView>['name'], string>;

/** Uygulamada kullanılan ikonlar: iOS'ta SF Symbols, Android'de Material Symbols. */
const icons = {
  back: { ios: 'chevron.left', android: 'arrow_back' },
  search: { ios: 'magnifyingglass', android: 'search' },
  edit: { ios: 'pencil', android: 'edit' },
  note: { ios: 'note.text', android: 'sticky_note_2' },
  check: { ios: 'checkmark', android: 'check' },
  close: { ios: 'xmark', android: 'close' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right' },
  plus: { ios: 'plus', android: 'add' },
  camera: { ios: 'camera', android: 'photo_camera' },
  photo: { ios: 'photo', android: 'image' },
  info: { ios: 'info.circle', android: 'info' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning' },
  error: { ios: 'exclamationmark.circle', android: 'error' },
  success: { ios: 'checkmark.circle', android: 'check_circle' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  people: { ios: 'person.2', android: 'group' },
  person: { ios: 'person', android: 'person' },
  book: { ios: 'book.closed', android: 'menu_book' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  trash: { ios: 'trash', android: 'delete' },
  eye: { ios: 'eye', android: 'visibility' },
  eyeOff: { ios: 'eye.slash', android: 'visibility_off' },
  mail: { ios: 'envelope', android: 'mail' },
  lock: { ios: 'lock', android: 'lock' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof icons;

/** Android `weight` dizesini yok sayar; Material Symbols ağırlığı ayrıca verilmeli. */
const symbolWeight = { ios: 'medium', android: androidMedium } as const;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Dekoratif ikon; anlam taşıyorsa çevresindeki dokunulabilir öğeye etiket verin. */
export function Icon({ name, size = iconSize.xl, color = colors.text, style }: IconProps) {
  return (
    <SymbolView
      name={icons[name]}
      size={size}
      tintColor={color}
      weight={symbolWeight}
      style={[{ width: size, height: size }, style]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
