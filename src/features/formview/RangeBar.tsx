import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Sheet, Text } from '@/components/ui';
import {
  RANGE_PRESETS,
  formatRange,
  matchRangePreset,
  normalizeRange,
  rangeForPreset,
  type DateRange,
} from '@/features/history';
import { DateStepper } from '@/features/sessions/components/DateStepper';
import { addDays, todayIso } from '@/features/sessions/date';
import { layout, spacing } from '@/theme';

interface RangeBarProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

/**
 * Dönem süzgeci (çipler sarar, hepsi görünür): hazır dönemler (tüm zamanlar varsayılan) ve "Tarih aralığı" çipi. Hazır
 * dönemlerden biri seçili değilse son çip seçili aralığı yazar ("1 – 7 Ekim 2026").
 */
export function RangeBar({ range, onChange }: RangeBarProps) {
  const [open, setOpen] = useState(false);
  const preset = matchRangePreset(range);

  return (
    <>
      <View style={styles.chips} accessibilityLabel="Dönem">
        {RANGE_PRESETS.map(({ id, label }) => (
          <Chip
            key={id}
            label={label}
            selected={preset === id}
            onPress={() => onChange(rangeForPreset(id))}
            accessibilityLabel={`Dönem: ${label}`}
            testID={`range-${id}`}
          />
        ))}
        <Chip
          label={preset === null ? formatRange(range) : 'Tarih aralığı'}
          icon="calendar"
          selected={preset === null}
          onPress={() => setOpen(true)}
          accessibilityLabel={preset === null ? `Dönem: ${formatRange(range)}. Değiştir` : 'Dönem: tarih aralığı seç'}
          testID="range-custom"
        />
      </View>
      <RangeSheet
        visible={open}
        range={range}
        onClose={() => setOpen(false)}
        onApply={(next) => {
          setOpen(false);
          onChange(next);
        }}
      />
    </>
  );
}

interface RangeSheetProps {
  visible: boolean;
  range: DateRange;
  onClose: () => void;
  onApply: (range: DateRange) => void;
}

/** Başlangıç ve bitiş gününü seçtiren panel. */
export function RangeSheet({ visible, range, onClose, onApply }: RangeSheetProps) {
  const today = todayIso();
  const initial = (): DateRange => {
    const r = normalizeRange(range);
    return { from: r.from ?? addDays(today, -6), to: r.to ?? today };
  };
  const [from, setFrom] = useState(() => initial().from ?? today);
  const [to, setTo] = useState(() => initial().to ?? today);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const r = initial();
      setFrom(r.from ?? today);
      setTo(r.to ?? today);
    }
  }

  // Uçlar yer değiştirmesin: biri diğerini aşarsa öteki ona çekilir.
  const changeFrom = (next: string) => {
    setFrom(next);
    if (next > to) setTo(next);
  };
  const changeTo = (next: string) => {
    setTo(next);
    if (next < from) setFrom(next);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Tarih aralığı"
      testID="range-sheet"
      footer={<Button label="Uygula" onPress={() => onApply({ from, to })} testID="range-apply" />}
    >
      <View style={styles.sheetBody}>
        <View style={styles.field}>
          <Text variant="label">Başlangıç</Text>
          <DateStepper value={from} onChange={changeFrom} label="Başlangıç" testIDPrefix="range-from" today={today} />
        </View>
        <View style={styles.field}>
          <Text variant="label">Bitiş</Text>
          <DateStepper value={to} onChange={changeTo} label="Bitiş" testIDPrefix="range-to" today={today} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: layout.pageX, gap: spacing.sm, paddingVertical: spacing.xs },
  sheetBody: { gap: spacing.lg },
  field: { gap: spacing.xs },
});
