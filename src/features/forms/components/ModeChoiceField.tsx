import { StyleSheet, View } from 'react-native';

import { SegmentedChoice, Text } from '@/components/ui';
import { spacing } from '@/theme';

import { formModeDescriptions, formModeLabels } from '../mode';
import type { ModeChoice } from '../presets';

const OPTIONS = [
  { key: 'suggested', label: 'Önerilen' },
  { key: 'daily', label: formModeLabels.daily },
  { key: 'repeatable', label: formModeLabels.repeatable },
] as const;

const CAPTIONS: Record<ModeChoice, string> = {
  suggested: 'Her form kendine uygun türle eklenir: yoklama günde bir kez, artı / eksi birikimli.',
  daily: formModeDescriptions.daily,
  repeatable: `${formModeDescriptions.repeatable} Uygun formlara puan da eklenir.`,
};

interface ModeChoiceFieldProps {
  value: ModeChoice;
  onChange: (value: ModeChoice) => void;
  disabled?: boolean;
  testIDPrefix?: string;
}

/**
 * Hazır form eklerken tür seçimi (tek denetim, seçilen tüm şablonlar için): "Önerilen"
 * şablonun kendi türünü korur; diğer ikisi türü zorlar. Birkaç şablon seçilirken her biri için
 * ayrı seçim istenmez.
 */
export function ModeChoiceField({ value, onChange, disabled, testIDPrefix = 'mode-choice' }: ModeChoiceFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="label">Form türü</Text>
      <SegmentedChoice
        options={OPTIONS}
        value={value}
        onChange={onChange}
        disabled={disabled}
        accessibilityLabel="Form türü"
        testIDPrefix={testIDPrefix}
      />
      <Text variant="caption" tone="muted" testID={`${testIDPrefix}-description`}>
        {CAPTIONS[value]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
});
