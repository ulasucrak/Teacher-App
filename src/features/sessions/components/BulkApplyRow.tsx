import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipGroup, Text } from '@/components/ui';
import { spacing } from '@/theme';
import type { FormOption } from '@/types/database';

export interface BulkApplyRowProps {
  options: readonly FormOption[];
  /** Herkes aynı seçenekteyse o seçenek (seçili görünür). */
  uniformOption: string | null;
  /** null → herkesin seçimini temizle. */
  onApply: (optionKey: string | null) => void;
  disabled?: boolean;
}

/** İnce "Tümü" satırı: bir seçeneği tüm öğrencilere uygular; seçili olana tekrar dokunmak temizler. */
export const BulkApplyRow = memo(function BulkApplyRow({ options, uniformOption, onApply, disabled }: BulkApplyRowProps) {
  return (
    <View style={styles.row} testID="bulk-row">
      <Text variant="label" style={styles.label}>
        Tümü
      </Text>
      <View style={styles.chips}>
        <ChipGroup
          options={options}
          value={uniformOption}
          disabled={disabled}
          contextLabel="Tüm öğrenciler"
          onChange={(key) => onApply(uniformOption === key ? null : key)}
          testIDPrefix="bulk"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  label: { paddingTop: spacing.sm + spacing.xxs },
  chips: { flex: 1 },
});
