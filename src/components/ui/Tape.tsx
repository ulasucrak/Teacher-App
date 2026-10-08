import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { paper, type PaperName } from '@/theme';

export interface TapeProps {
  /** Bant rengi (varsayılan `sari`). */
  paper?: PaperName;
  /** Derece cinsinden eğim; varsayılan -4. Kartlar arası çeşitlilik için `tapeRotation(index)`. */
  rotate?: number;
  /** Üst kenarın ortasından sapma (px). Varsayılan: ortada. */
  offsetX?: number;
  style?: StyleProp<ViewStyle>;
}

/** Dekoratif eğri bant için kararlı eğim: öğe sırasından -4..+4 derece (mockup `(i*7)%9-4`). */
export function tapeRotation(index: number): number {
  return ((index * 7) % 9) - 4;
}

/**
 * Kâğıdı panoya tutturan renkli bant. Üst kenarda yarı dışarı taşar (mutlak konumlu); ana kapsayıcı
 * `overflow: visible` olmalı. Dekoratif: ekran okuyucudan gizli, dokunmayı engellemez.
 */
export function Tape({ paper: paperName = 'sari', rotate = -4, offsetX = 0, style }: TapeProps) {
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.tape,
        { backgroundColor: paper[paperName], transform: [{ translateX: offsetX }, { rotate: `${rotate}deg` }] },
        style,
      ]}
    />
  );
}

const WIDTH = 64;
const HEIGHT = 20;

const styles = StyleSheet.create({
  tape: {
    position: 'absolute',
    top: -HEIGHT / 2 - 2,
    left: '50%',
    marginLeft: -WIDTH / 2,
    width: WIDTH,
    height: HEIGHT,
    opacity: 0.92,
  },
});
