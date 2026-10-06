import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, Sheet, Text } from '@/components/ui';
import { formatSessionDate, todayIso } from '@/features/sessions/date';
import { colors, layout, radii, spacing } from '@/theme';

import { WEEKDAY_HEADERS, monthGrid, monthOf, monthTitle, shiftMonth, type MonthRef } from './calendar';

interface CalendarSheetProps {
  visible: boolean;
  /** Seçili gün. */
  value: string;
  onClose: () => void;
  onPick: (day: string) => void;
  /** İleri günler seçilebilsin mi (varsayılan: bugünden sonrası kapalı). */
  allowFuture?: boolean;
  title?: string;
}

/** Ay ızgaralı gün seçici (yeni bağımlılık gerektirmez). Gün seçilince panel kapanır. */
export function CalendarSheet({ visible, value, onClose, onPick, allowFuture = false, title = 'Gün seçin' }: CalendarSheetProps) {
  const today = todayIso();
  const [month, setMonth] = useState<MonthRef>(() => monthOf(value));
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setMonth(monthOf(value));
  }

  const weeks = monthGrid(month);
  const nextMonthFirst = `${shiftMonth(month, 1).year}-${String(shiftMonth(month, 1).month).padStart(2, '0')}-01`;
  const canGoNext = allowFuture || nextMonthFirst <= today;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} testID="calendar-sheet">
      <View style={styles.monthRow}>
        <IconButton
          icon="back"
          accessibilityLabel="Önceki ay"
          onPress={() => setMonth((m) => shiftMonth(m, -1))}
          color={colors.primary}
          testID="calendar-prev"
        />
        <Text variant="bodyStrong" align="center" style={styles.monthTitle} accessibilityRole="header" testID="calendar-title">
          {monthTitle(month)}
        </Text>
        <IconButton
          icon="chevronRight"
          accessibilityLabel="Sonraki ay"
          onPress={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={!canGoNext}
          color={colors.primary}
          testID="calendar-next"
        />
      </View>
      <View style={styles.week}>
        {WEEKDAY_HEADERS.map((name) => (
          <View key={name} style={styles.cell}>
            <Text variant="caption" tone="muted" align="center">
              {name}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week, row) => (
        <View key={row} style={styles.week}>
          {week.map((day, col) => {
            if (!day) return <View key={col} style={styles.cell} />;
            const selected = day === value;
            const disabled = !allowFuture && day > today;
            return (
              <View key={day} style={styles.cell}>
                <Pressable
                  onPress={() => onPick(day)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={formatSessionDate(day)}
                  accessibilityState={{ selected, disabled }}
                  testID={`calendar-day-${day}`}
                  style={({ pressed }) => [
                    styles.day,
                    selected && styles.selected,
                    !selected && day === today && styles.today,
                    pressed && !selected && styles.pressed,
                  ]}
                >
                  <Text variant="label" color={selected ? colors.textInverse : disabled ? colors.border : colors.text}>
                    {String(Number(day.slice(8)))}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  monthTitle: { flex: 1 },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: layout.chipHeight + spacing.xs },
  day: {
    width: layout.chipHeight,
    height: layout.chipHeight,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.text },
  today: { borderWidth: layout.inputBorder, borderColor: colors.primary },
  pressed: { backgroundColor: colors.rule },
});
