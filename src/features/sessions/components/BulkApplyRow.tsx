import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { layout, spacing } from '@/theme';
import type { FormOption } from '@/types/database';

import { isSegmented, OptionPicker } from './OptionPicker';

export interface BulkApplyRowProps {
  options: readonly FormOption[];
  /** Herkes aynı seçenekteyse o seçenek (seçili görünür). */
  uniformOption: string | null;
  /** null → herkesin seçimini temizle. */
  onApply: (optionKey: string | null) => void;
  disabled?: boolean;
  /** false: öğrenci satırlarında numara sütunu yok; "Tümü" etiketi sütun payı almaz. */
  showNumbers?: boolean;
}

/** İnce "Tümü" satırı: bir seçeneği tüm öğrencilere uygular; seçili olana tekrar dokunmak temizler. */
export const BulkApplyRow = memo(function BulkApplyRow({ options, uniformOption, onApply, disabled, showNumbers = true }: BulkApplyRowProps) {
  // Numara sütunu yoksa etiket seçicinin üstüne geçer (öğrenci satırlarıyla aynı hizada, tam genişlik).
  const inline = isSegmented(options) && showNumbers;
  return (
    <View style={inline ? styles.row : styles.column} testID="bulk-row">
      <Text variant="label" style={inline ? styles.label : undefined}>
        Tümü
      </Text>
      <View style={inline ? styles.chips : undefined}>
        <OptionPicker
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
  row: { flexDirection: 'row', alignItems: 'center' },
  column: { gap: spacing.sm },
  // Öğrenci satırlarındaki seçeneklerle aynı hizada başlar (numara sütunu + boşluk).
  label: { width: layout.numberColumn + spacing.md },
  chips: { flex: 1 },
});
