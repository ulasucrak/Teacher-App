import { useState } from 'react';

import { Button, Sheet } from '@/components/ui';

import { todayIso } from '../date';
import { DateStepper } from './DateStepper';

export interface DaySheetProps {
  visible: boolean;
  onClose: () => void;
  /** Seçilen günün kaydını aç. */
  onPick: (date: string) => void;
  /** Panel tamamen kapandıktan sonra (gezinme için güvenli an). */
  onDismissed?: () => void;
}

/** "Başka gün": geçmiş bir günün kaydını açmak için basit gün seçici. */
export function DaySheet({ visible, onClose, onPick, onDismissed }: DaySheetProps) {
  const [date, setDate] = useState(() => todayIso());
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDate(todayIso());
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      title="Gün seçin"
      testID="day-sheet"
      footer={<Button label="Bu günü aç" onPress={() => onPick(date)} testID="day-sheet-open" />}
    >
      <DateStepper value={date} onChange={setDate} />
    </Sheet>
  );
}
