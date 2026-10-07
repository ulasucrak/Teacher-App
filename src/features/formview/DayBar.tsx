import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, IconButton, Text } from '@/components/ui';
import { addDays, formatDayLabel, formatSessionDate, todayIso } from '@/features/sessions/date';
import { colors, iconSize, layout, radii, spacing } from '@/theme';

import { CalendarSheet } from './CalendarSheet';

interface DayBarProps {
  value: string;
  onChange: (day: string) => void;
  /** Sağda kısa bilgi (ilerleme gibi). */
  trailing?: string;
  trailingLabel?: string;
  /** Düğmelere `${prefix}-prev` / `-next` / `-pick` verilir. */
  testIDPrefix?: string;
}

/**
 * Gün çubuğu: önceki / sonraki gün düğmeleri ve ortada tarih (dokununca takvim açılır).
 * Bugünden sonrası seçilemez.
 */
export function DayBar({ value, onChange, trailing, trailingLabel, testIDPrefix = 'day' }: DayBarProps) {
  const [open, setOpen] = useState(false);
  const today = todayIso();
  const label = formatDayLabel(value, today);

  return (
    <View style={styles.row}>
      <IconButton
        icon="chevronLeft"
        accessibilityLabel="Önceki gün"
        onPress={() => onChange(addDays(value, -1))}
        color={colors.primary}
        testID={`${testIDPrefix}-prev`}
      />
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Gün: ${formatSessionDate(value)}`}
        accessibilityHint="Takvimden gün seçer"
        testID={`${testIDPrefix}-pick`}
        style={({ pressed }) => [styles.label, pressed && styles.pressed]}
      >
        <Icon name="calendar" size={iconSize.md} color={colors.primary} />
        <Text variant="bodyStrong" numberOfLines={1} testID={`${testIDPrefix}-label`}>
          {label}
        </Text>
      </Pressable>
      <IconButton
        icon="chevronRight"
        accessibilityLabel="Sonraki gün"
        onPress={() => onChange(addDays(value, 1))}
        disabled={value >= today}
        color={colors.primary}
        testID={`${testIDPrefix}-next`}
      />
      {trailing ? (
        <Text variant="number" tone="muted" accessibilityLabel={trailingLabel} style={styles.trailing} testID={`${testIDPrefix}-trailing`}>
          {trailing}
        </Text>
      ) : null}
      <CalendarSheet
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onPick={(day) => {
          setOpen(false);
          onChange(day);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs, minHeight: layout.minTouch },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  pressed: { backgroundColor: colors.pressedOverlay },
  trailing: { marginLeft: 'auto', paddingRight: layout.pageX - spacing.xs },
});
