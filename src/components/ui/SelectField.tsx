import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, iconSize, layout, radii, spacing } from '@/theme';

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
}: SelectFieldProps<V>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text variant="label">{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Seçenekleri açar"
        accessibilityState={{ disabled, expanded: open }}
        style={({ pressed }) => [
          styles.trigger,
          { borderColor: error ? colors.danger : colors.border },
          pressed && styles.pressed,
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
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: isSelected, selected: isSelected }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
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
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md + spacing.xxs,
  },
  value: { flex: 1 },
  pressed: { backgroundColor: colors.surfaceMuted },
  disabled: { opacity: 0.5 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch + spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    paddingVertical: spacing.sm,
  },
  optionTexts: { flex: 1, gap: spacing.xxs },
});
