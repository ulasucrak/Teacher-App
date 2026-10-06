import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';

import { addDays, formatSessionDate, relativeDayLabel, todayIso } from '../date';

export interface DateStepperProps {
  value: string;
  onChange: (iso: string) => void;
  /** İleri tarih seçilebilsin mi (varsayılan: bugünden sonrası kapalı). */
  allowFuture?: boolean;
  today?: string;
  /** Ekran okuyucu adı ve alt satır; varsayılan "Kayıt tarihi" (dönem seçicide "Başlangıç" / "Bitiş"). */
  label?: string;
  /** Verilirse düğmeler `${prefix}-prev` / `-next`, değer `${prefix}-value` olur (varsayılan `date`). */
  testIDPrefix?: string;
}

/** Önceki / sonraki gün düğmeli basit tarih seçici (yeni bağımlılık gerektirmez). */
export function DateStepper({
  value,
  onChange,
  allowFuture = false,
  today = todayIso(),
  label = 'Kayıt tarihi',
  testIDPrefix = 'date',
}: DateStepperProps) {
  const canGoNext = allowFuture || value < today;
  const relative = relativeDayLabel(value, today);
  return (
    <View style={styles.wrap}>
      <IconButton
        icon="back"
        accessibilityLabel={`${label}: önceki gün`}
        testID={`${testIDPrefix}-prev`}
        onPress={() => onChange(addDays(value, -1))}
        color={colors.primary}
      />
      <View style={styles.center} testID={`${testIDPrefix}-value`} accessible accessibilityLabel={`${label}: ${formatSessionDate(value)}`}>
        <Text variant="label" align="center" numberOfLines={1}>
          {formatSessionDate(value)}
        </Text>
        <Text variant="caption" tone="muted" align="center">
          {relative ?? label}
        </Text>
      </View>
      <IconButton
        icon="chevronRight"
        accessibilityLabel={`${label}: sonraki gün`}
        testID={`${testIDPrefix}-next`}
        onPress={() => onChange(addDays(value, 1))}
        disabled={!canGoNext}
        color={colors.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    minHeight: layout.buttonHeight,
  },
  center: { flex: 1, paddingVertical: spacing.xs },
});
