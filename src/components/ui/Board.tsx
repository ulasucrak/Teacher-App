import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

export interface BoardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Pano zemini: düz koyu mavi (`colors.board`). Sınıf modunun zemini; üstüne `PaperCard onBoard` ya da beyaz,
 * kurşun çerçeveli öğeler konur (gölge `colors.boardDeep`). Bu zeminde yazı beyaz, kartta kurşundur.
 * Web'de odak halkası sarıya döner (mavi halka mavi zeminde görünmez; bkz. public/index.html).
 */
export function Board({ children, style, testID }: BoardProps) {
  const web = Platform.OS === 'web' ? ({ dataSet: { board: 'true' } } as object) : null;
  return (
    <View testID={testID} style={[styles.board, style]} {...web}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, backgroundColor: colors.board },
});
