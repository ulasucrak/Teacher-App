import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { colors, fontScale, iconSize, layout, radii, spacing, tones, typography } from '@/theme';
import type { FormOptionTone } from '@/types/database';

import { MAX_LABEL_LENGTH, MAX_OPTIONS, createDraftOption, moveOption, type DraftOption } from '../options';
import { FormIconButton } from './FormIcon';
import { TonePicker } from './TonePicker';

interface OptionsEditorProps {
  options: readonly DraftOption[];
  onChange: (options: DraftOption[]) => void;
  /** Seçenek `id` → hata metni (yalnızca kaydetme denendikten sonra verilir). */
  errors?: Record<string, string>;
}

/** Seçenek ekleme, yeniden adlandırma, renk, sıra ve kaldırma. */
export function OptionsEditor({ options, onChange, errors = {} }: OptionsEditorProps) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const atMax = options.length >= MAX_OPTIONS;

  const update = (id: string, patch: Partial<Pick<DraftOption, 'label' | 'tone'>>) => {
    onChange(options.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };

  const add = () => {
    if (atMax) return;
    const option = createDraftOption('neutral');
    setFocusId(option.id);
    onChange([...options, option]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.list}>
        {options.map((option, index) => {
          const name = option.label.trim() || 'Adsız seçenek';
          const error = errors[option.id];
          return (
            <OptionRow
              key={option.id}
              option={option}
              name={name}
              error={error}
              autoFocus={option.id === focusId}
              canMoveUp={index > 0}
              canMoveDown={index < options.length - 1}
              onLabel={(label) => update(option.id, { label })}
              onTone={(tone) => update(option.id, { tone })}
              onMove={(dir) => onChange(moveOption(options, index, dir))}
              onRemove={() => onChange(options.filter((o) => o.id !== option.id))}
            />
          );
        })}
      </View>
      <Button
        label="Seçenek ekle"
        icon="plus"
        variant="secondary"
        size="sm"
        fullWidth={false}
        onPress={add}
        disabled={atMax}
        accessibilityHint={atMax ? `En fazla ${MAX_OPTIONS} seçenek eklenebilir` : undefined}
      />
      {atMax ? (
        <Text variant="caption" tone="muted">
          En fazla {MAX_OPTIONS} seçenek eklenebilir. Yenisi için bir seçeneği kaldırın.
        </Text>
      ) : null}
    </View>
  );
}

interface OptionRowProps {
  option: DraftOption;
  name: string;
  error?: string;
  autoFocus: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onLabel: (label: string) => void;
  onTone: (tone: FormOptionTone) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

function OptionRow({
  option,
  name,
  error,
  autoFocus,
  canMoveUp,
  canMoveDown,
  onLabel,
  onTone,
  onMove,
  onRemove,
}: OptionRowProps) {
  const [focused, setFocused] = useState(false);
  const t = tones[option.tone];
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.inputWrap,
          { borderColor },
          (focused || Boolean(error)) && styles.inputWrapEmphasis,
        ]}
      >
        <View style={[styles.toneBar, { backgroundColor: t.solid }]} />
        <TextInput
          value={option.label}
          onChangeText={onLabel}
          placeholder="Seçenek adı, örn. Geldi"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={`Seçenek adı: ${name}`}
          aria-invalid={Boolean(error)}
          autoFocus={autoFocus}
          maxLength={MAX_LABEL_LENGTH + 8}
          returnKeyType="done"
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxFontSizeMultiplier={fontScale.max}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
        />
      </View>
      <View style={styles.controls}>
        <TonePicker value={option.tone} onChange={onTone} contextLabel={name} />
        <View style={styles.actions}>
          <FormIconButton
            icon="arrowUp"
            accessibilityLabel={`${name} seçeneğini yukarı taşı`}
            onPress={() => onMove(-1)}
            disabled={!canMoveUp}
            color={colors.textMuted}
          />
          <FormIconButton
            icon="chevronDown"
            accessibilityLabel={`${name} seçeneğini aşağı taşı`}
            onPress={() => onMove(1)}
            disabled={!canMoveDown}
            color={colors.textMuted}
          />
          <FormIconButton
            icon="trash"
            accessibilityLabel={`${name} seçeneğini kaldır`}
            onPress={onRemove}
            color={colors.danger}
            size={iconSize.lg}
          />
        </View>
      </View>
      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Icon name="error" size={iconSize.sm} color={colors.danger} />
          <Text variant="caption" tone="danger" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, alignItems: 'flex-start' },
  list: { alignSelf: 'stretch' },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    gap: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouch,
    borderRadius: radii.sm,
    borderWidth: layout.inputBorder,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  inputWrapEmphasis: { borderWidth: layout.inputBorderFocus },
  toneBar: { alignSelf: 'stretch', width: spacing.xs },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center' },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  errorText: { flex: 1 },
});
