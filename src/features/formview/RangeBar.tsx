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

/** Seçili dönemin kısa adı: "Tüm zamanlar", "Bu hafta", "29 Eylül – 6 Ekim 2026". */
export function rangeLabel(range: DateRange): string {
  const preset = matchRangePreset(range);
  return RANGE_PRESETS.find((p) => p.id === preset)?.label ?? formatRange(range);
}

/**
 * Dönem süzgeci: tek çip (varsayılan "Tüm zamanlar"); dokununca hazır dönemler ve tarih aralığı
 * paneli açılır. Tek satır yer kaplar.
 */
export function RangeBar({ range, onChange }: RangeBarProps) {
  const [open, setOpen] = useState(false);
  const label = rangeLabel(range);

  return (
    <View style={styles.row}>
      <Chip
        label={label}
        icon="calendar"
        selected={matchRangePreset(range) !== 'all'}
        onPress={() => setOpen(true)}
        accessibilityLabel={`Dönem: ${label}. Değiştir`}
        testID="range-chip"
      />
      <RangeSheet
        visible={open}
        range={range}
        onClose={() => setOpen(false)}
        onApply={(next) => {
          setOpen(false);
          onChange(next);
        }}
      />
    </View>
  );
}

interface RangeSheetProps {
  visible: boolean;
  range: DateRange;
  onClose: () => void;
  onApply: (range: DateRange) => void;
}

/** Hazır dönemler (dokununca uygulanır) ve başlangıç / bitiş günü seçtiren panel. */
export function RangeSheet({ visible, range, onClose, onApply }: RangeSheetProps) {
  const today = todayIso();
  const initial = (): { from: string; to: string } => {
    const r = normalizeRange(range);
    return { from: r.from ?? addDays(today, -6), to: r.to ?? today };
  };
  const [from, setFrom] = useState(() => initial().from);
  const [to, setTo] = useState(() => initial().to);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const r = initial();
      setFrom(r.from);
      setTo(r.to);
    }
  }
  const preset = matchRangePreset(range);

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
      title="Dönem"
      testID="range-sheet"
      footer={<Button label="Aralığı uygula" onPress={() => onApply({ from, to })} testID="range-apply" />}
    >
      <View style={styles.sheetBody}>
        <View style={styles.presets}>
          {RANGE_PRESETS.map(({ id, label }) => (
            <Chip
              key={id}
              label={label}
              selected={preset === id}
              onPress={() => onApply(rangeForPreset(id))}
              accessibilityLabel={`Dönem: ${label}`}
              testID={`range-${id}`}
            />
          ))}
        </View>
        <Text variant="label">Tarih aralığı</Text>
        <View style={styles.field}>
          <Text variant="caption" tone="muted">
            Başlangıç
          </Text>
          <DateStepper value={from} onChange={changeFrom} label="Başlangıç" testIDPrefix="range-from" today={today} />
        </View>
        <View style={styles.field}>
          <Text variant="caption" tone="muted">
            Bitiş
          </Text>
          <DateStepper value={to} onChange={changeTo} label="Bitiş" testIDPrefix="range-to" today={today} />
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: layout.pageX, paddingBottom: spacing.sm },
  sheetBody: { gap: spacing.md },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { gap: spacing.xs },
});
