import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import { colors, fontScale, iconSize, layout, radii, spacing, tones, typography } from '@/theme';
import type { FormOptionTone } from '@/types/database';

import { MAX_LABEL_LENGTH, MAX_OPTIONS, createDraftOption, moveOption, toneLabels, type DraftOption } from '../options';
import { FormIconButton } from './FormIcon';
import { TonePicker } from './TonePicker';

interface OptionsEditorProps {
  options: readonly DraftOption[];
  onChange: (options: DraftOption[]) => void;
  /** Seçenek `id` → hata metni (yalnızca kaydetme denendikten sonra verilir). */
  errors?: Record<string, string>;
  /** Sıralama ve kaldırma düğmeleri ("Düzenle" açıkken). */
  editing?: boolean;
}

/**
 * Kompakt seçenek listesi: renk noktası + ad. Noktaya dokununca renk seçici açılır.
 * Sıralama ve kaldırma yalnızca `editing` açıkken görünür.
 */
export function OptionsEditor({ options, onChange, errors = {}, editing = false }: OptionsEditorProps) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const [toneOpenId, setToneOpenId] = useState<string | null>(null);
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
          return (
            <OptionRow
              key={option.id}
              index={index}
              option={option}
              name={name}
              error={errors[option.id]}
              autoFocus={option.id === focusId}
              editing={editing}
              toneOpen={toneOpenId === option.id}
              canMoveUp={index > 0}
              canMoveDown={index < options.length - 1}
              onToggleTone={() => setToneOpenId((cur) => (cur === option.id ? null : option.id))}
              onLabel={(label) => update(option.id, { label })}
              onTone={(tone) => {
                update(option.id, { tone });
                setToneOpenId(null);
              }}
              onMove={(dir) => onChange(moveOption(options, index, dir))}
              onRemove={() => onChange(options.filter((o) => o.id !== option.id))}
            />
          );
        })}
      </View>
      {atMax ? (
        <Text variant="caption" tone="muted">
          En fazla {MAX_OPTIONS} seçenek eklenebilir.
        </Text>
      ) : (
        <Button
          label="Seçenek ekle"
          icon="plus"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={add}
          testID="option-add"
          style={styles.addButton}
        />
      )}
    </View>
  );
}

interface OptionRowProps {
  index: number;
  option: DraftOption;
  name: string;
  error?: string;
  autoFocus: boolean;
  editing: boolean;
  toneOpen: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggleTone: () => void;
  onLabel: (label: string) => void;
  onTone: (tone: FormOptionTone) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

function OptionRow({
  index,
  option,
  name,
  error,
  autoFocus,
  editing,
  toneOpen,
  canMoveUp,
  canMoveDown,
  onToggleTone,
  onLabel,
  onTone,
  onMove,
  onRemove,
}: OptionRowProps) {
  const [focused, setFocused] = useState(false);
  const t = tones[option.tone];
  const testID = `option-row-${index}`;

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.line}>
        <Pressable
          onPress={onToggleTone}
          accessibilityRole="button"
          accessibilityLabel={`${name} rengi: ${toneLabels[option.tone]}`}
          accessibilityHint="Rengi değiştirir"
          accessibilityState={{ expanded: toneOpen }}
          testID={`${testID}-tone`}
          style={({ pressed }) => [styles.toneHit, pressed && styles.pressed]}
        >
          <View style={[styles.swatch, { backgroundColor: t.solid }]} />
        </Pressable>
        <View
          style={[
            styles.inputWrap,
            focused && styles.inputFocused,
            Boolean(error) && styles.inputError,
          ]}
        >
          <TextInput
            value={option.label}
            onChangeText={onLabel}
            placeholder={PLACEHOLDERS[index] ?? 'Seçenek adı'}
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
            testID={`${testID}-input`}
          />
        </View>
        {editing ? (
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
        ) : null}
      </View>
      {toneOpen ? (
        <View style={styles.tonePicker}>
          <TonePicker value={option.tone} onChange={onTone} contextLabel={name} />
        </View>
      ) : null}
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

const SWATCH = spacing.xxl;
const PLACEHOLDERS = ['Örneğin Geldi', 'Örneğin Gelmedi'];

const styles = StyleSheet.create({
  container: { gap: spacing.sm, alignItems: 'flex-start' },
  list: { alignSelf: 'stretch', gap: spacing.sm },
  row: { gap: spacing.xs },
  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  toneHit: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
    marginLeft: -spacing.sm,
  },
  pressed: { backgroundColor: colors.pressedOverlay },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: radii.full },
  inputWrap: {
    flex: 1,
    minHeight: layout.minTouch,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: layout.inputBorderFocus,
    borderColor: colors.surfaceMuted,
    justifyContent: 'center',
  },
  inputFocused: { backgroundColor: colors.surface, borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  input: {
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  addButton: { marginLeft: -spacing.md },
  tonePicker: { marginLeft: layout.minTouch - spacing.sm },
  error: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginLeft: layout.minTouch - spacing.sm },
  errorText: { flex: 1 },
});
