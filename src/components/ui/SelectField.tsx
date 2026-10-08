import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { isHovered, isWeb } from '@/lib/platform';
import { colors, iconSize, layout, radii, spacing } from '@/theme';

import { selectionA11y } from './a11y';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { Text } from './Text';

export interface SelectOption<V extends string> {
  value: V;
  label: string;
  description?: string;
}

export interface SelectFieldProps<V extends string> {
  label: string;
  /** Örn. "Sınıf seçin". */
  placeholder: string;
  options: readonly SelectOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** Panel başlığı; varsayılan: label. */
  sheetTitle?: string;
  error?: string | null;
  disabled?: boolean;
  /** Alana `testID`, seçeneklere `${testID}-${value}` verilir. */
  testID?: string;
}

/** Açılır seçici: alan gibi görünür, dokununca alttan panel açar. */
export function SelectField<V extends string>({
  label,
  placeholder,
  options,
  value,
  onChange,
  sheetTitle,
  error,
  disabled = false,
  testID,
}: SelectFieldProps<V>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Seçenekleri açar"
        accessibilityState={{ disabled, expanded: open }}
        style={(state) => [
          styles.trigger,
          error ? styles.error : null,
          !disabled && !state.pressed && isHovered(state) && styles.triggerHovered,
          state.pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text variant="body" tone={selected ? 'default' : 'muted'} numberOfLines={1} style={styles.value}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon name="chevronDown" size={iconSize.md} color={colors.textMuted} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Sheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? label}>
        <View accessibilityRole="radiogroup">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                testID={testID ? `${testID}-${option.value}` : undefined}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                {...selectionA11y({ checked: isSelected, selected: isSelected })}
                style={(state) => [
                  styles.option,
                  isWeb ? styles.optionFlat : styles.optionBorder,
                  !state.pressed && isHovered(state) && styles.optionHovered,
                  state.pressed && styles.pressed,
                ]}
              >
                <View style={styles.optionTexts}>
                  <Text variant={isSelected ? 'bodyStrong' : 'body'}>{option.label}</Text>
                  {option.description ? (
                    <Text variant="caption" tone="muted">
                      {option.description}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? <Icon name="check" size={iconSize.lg} color={colors.primary} /> : null}
                {isWeb && index < options.length - 1 ? <View style={styles.optionDivider} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs + spacing.xxs },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.buttonHeight,
    borderRadius: radii.sm,
    borderWidth: layout.inputBorder,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  error: { borderColor: colors.danger, borderWidth: layout.inputBorderFocus },
  value: { flex: 1 },
  pressed: { backgroundColor: colors.surfaceMuted },
  /** Yalnızca web (fare). */
  triggerHovered: { filter: 'brightness(0.98)' },
  disabled: { opacity: 0.5 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.rowHeight - spacing.sm,
    paddingVertical: spacing.sm,
  },
  optionBorder: { borderBottomWidth: layout.hairline, borderBottomColor: colors.rule },
  /** Web: üstünde/basılı zemini panelin kenarlarına kadar uzanır, ayraç içerikle hizalı ayrı çizgi. */
  optionFlat: { marginHorizontal: -layout.pageX, paddingHorizontal: layout.pageX },
  optionHovered: { backgroundColor: colors.surfaceMuted },
  optionDivider: {
    position: 'absolute',
    left: layout.pageX,
    right: layout.pageX,
    bottom: 0,
    height: layout.hairline,
    backgroundColor: colors.rule,
  },
  optionTexts: { flex: 1, gap: spacing.xxs },
});
