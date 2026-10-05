import { StyleSheet, View } from 'react-native';

import { spacing, type ToneName } from '@/theme';

import { OptionChip } from './OptionChip';

export interface OptionGridItem {
  key: string;
  label: string;
  tone: ToneName;
}

export interface OptionGridProps {
  options: readonly OptionGridItem[];
  /** Seçili seçenek anahtarı (tek seçim). */
  value: string | null | undefined;
  onChange: (key: string) => void;
  columns?: number;
  disabled?: boolean;
  /** Ekran okuyucu bağlamı, örn. öğrenci adı: "Ayşe Yılmaz". */
  contextLabel?: string;
}

/** Seçenek çiplerini eşit sütunlu ızgarada dizer (varsayılan 3 sütun). */
export function OptionGrid({
  options,
  value,
  onChange,
  columns = 3,
  disabled,
  contextLabel,
}: OptionGridProps) {
  const rows: OptionGridItem[][] = [];
  for (let i = 0; i < options.length; i += columns) {
    rows.push(options.slice(i, i + columns));
  }

  return (
    <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel={contextLabel}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((option) => (
            <OptionChip
              key={option.key}
              label={option.label}
              tone={option.tone}
              selected={value === option.key}
              disabled={disabled}
              onPress={() => onChange(option.key)}
              accessibilityLabel={contextLabel ? `${contextLabel}: ${option.label}` : option.label}
            />
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={styles.pad} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  pad: { flex: 1 },
});
