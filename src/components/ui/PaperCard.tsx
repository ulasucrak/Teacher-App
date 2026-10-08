import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { paperCycle, type PaperName } from '@/theme';

import { Card } from './Card';
import { tapeRotation } from './Tape';

export interface PaperCardProps {
  children: ReactNode;
  /** Kâğıt rengi. Verilmezse beyaz kâğıt. */
  paper?: PaperName;
  /**
   * Bant: `false` bantsız; renk adı o renkte; `true`/verilmezse `tapeIndex`'e göre sırayla renk ve eğim
   * (listede her kartın bandı farklı görünür, ama her çizimde aynı kalır).
   */
  tape?: boolean | PaperName;
  /** Kartın listedeki sırası: bant rengini ve eğimini belirler. */
  tapeIndex?: number;
  /** Mavi pano (`Board`) üstünde mi? Gölge koyu mavi olur (mockup `.tile`). */
  onBoard?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Bantlı kâğıt kart: kalın kurşun çerçeve + sert gölge + üstte eğri renkli bant. Panoya iliştirilmiş not gibi.
 * Sınıf modu karoları (`onBoard`) ve vurgulanacak tek tük kartlar için; sıradan listelerde `ListRow` kullanın.
 */
export function PaperCard({
  children,
  paper,
  tape = true,
  tapeIndex = 0,
  onBoard = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: PaperCardProps) {
  const tapeColor: PaperName | undefined =
    tape === false ? undefined : typeof tape === 'string' ? tape : (paperCycle[Math.abs(tapeIndex) % paperCycle.length] ?? 'sari');
  return (
    <Card
      variant={paper ? 'paper' : 'outlined'}
      paper={paper}
      tape={tapeColor}
      tapeRotate={tapeRotation(tapeIndex)}
      shadowSize="lg"
      shadowOn={onBoard ? 'board' : 'ink'}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={style}
      testID={testID}
    >
      {children}
    </Card>
  );
}
