import { ChipGroup, SegmentedChoice } from '@/components/ui';
import type { FormOption } from '@/types/database';

/** Bu kadar ve daha az seçenekte tek satırlık eşit segmentler kullanılır. */
export const SEGMENTED_MAX_OPTIONS = 4;

/** Seçenekler tek satır segment olarak mı gösterilir? */
export function isSegmented(options: readonly unknown[]): boolean {
  return options.length <= SEGMENTED_MAX_OPTIONS;
}

export interface OptionPickerProps {
  options: readonly FormOption[];
  value: string | null;
  onChange: (key: string) => void;
  disabled?: boolean;
  /** Ekran okuyucu bağlamı: "Ayşe Yılmaz" → "Ayşe Yılmaz: Geldi". */
  contextLabel: string;
  testIDPrefix: string;
}

/**
 * Doldurma satırının seçici: 2–4 seçenekte tek satır `SegmentedChoice` (Yoklama satırı
 * iki satıra taşmaz), daha fazlasında saran kompakt `ChipGroup`.
 */
export function OptionPicker({ options, value, onChange, disabled, contextLabel, testIDPrefix }: OptionPickerProps) {
  if (isSegmented(options)) {
    return (
      <SegmentedChoice
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
        accessibilityLabel={contextLabel}
        testIDPrefix={testIDPrefix}
      />
    );
  }
  return (
    <ChipGroup
      options={options}
      value={value}
      onChange={onChange}
      disabled={disabled}
      contextLabel={contextLabel}
      testIDPrefix={testIDPrefix}
    />
  );
}
