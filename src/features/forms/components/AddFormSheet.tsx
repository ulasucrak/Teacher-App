import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Banner, IconTile, Sheet, Text, type IconName } from '@/components/ui';
import { colors, layout, radii, spacing, type PaperName } from '@/theme';

import { sameTitle } from '../format';
import { formModeLabels } from '../mode';
import { PRESETS, formPaper, presetFormValues, presetIcon, type ModeChoice, type PresetId } from '../presets';
import { ModeChoiceField } from './ModeChoiceField';

export interface AddFormSheetProps {
  visible: boolean;
  onClose: () => void;
  onDismissed?: () => void;
  /** Bu sınıftaki form adları ("Bu sınıfta var" notu için). */
  existingTitles: readonly string[];
  /** Eklenmekte olan şablon. */
  busyPreset?: PresetId | null;
  /** Ekleme hatası (panel açıkken toast görünmez). */
  error?: string | null;
  /** Hazır formların ekleneceği tür ("Önerilen": şablonun kendi türü). */
  modeChoice: ModeChoice;
  onModeChoice: (choice: ModeChoice) => void;
  onPreset: (id: PresetId) => void;
  onCopyFromOther: () => void;
  onBlank: () => void;
}

/**
 * "+ Form" paneli: üstte form türü ("Önerilen" varsayılan), hazır formlar tek dokunuşla
 * eklenir (satırın altında hangi türle ekleneceği yazar); ardından kopyala ve boş form.
 */
export function AddFormSheet({
  visible,
  onClose,
  onDismissed,
  existingTitles,
  busyPreset = null,
  error,
  modeChoice,
  onModeChoice,
  onPreset,
  onCopyFromOther,
  onBlank,
}: AddFormSheetProps) {
  const busy = busyPreset !== null;
  return (
    <Sheet visible={visible} onClose={onClose} onDismissed={onDismissed} title="Form ekle" testID="add-form-sheet">
      {error ? (
        <View style={styles.error}>
          <Banner kind="error" message={error} />
        </View>
      ) : null}
      <View style={styles.mode}>
        <ModeChoiceField value={modeChoice} onChange={onModeChoice} disabled={busy} />
      </View>
      {PRESETS.map((p) => {
        const exists = existingTitles.some((t) => sameTitle(t, p.title));
        const mode = formModeLabels[presetFormValues(p, modeChoice).mode];
        return (
          <SheetRow
            key={p.id}
            icon={presetIcon(p.id)}
            paper={formPaper(p.id)}
            label={p.title}
            hint={exists ? `${mode}. Bu sınıfta var` : mode}
            busy={busyPreset === p.id}
            disabled={busy}
            onPress={() => onPreset(p.id)}
            testID={`add-form-preset-${p.id}`}
          />
        );
      })}
      <SheetRow
        icon="copy"
        label="Başka sınıftan kopyala"
        disabled={busy}
        onPress={onCopyFromOther}
        testID="add-form-copy"
      />
      <SheetRow icon="plus" label="Boş form" disabled={busy} onPress={onBlank} testID="add-form-blank" last />
    </Sheet>
  );
}

interface SheetRowProps {
  icon: IconName;
  /** İkon kutusunun kâğıt rengi (hazır formlarda formun kimlik rengi). */
  paper?: PaperName;
  label: string;
  hint?: string;
  busy?: boolean;
  disabled?: boolean;
  last?: boolean;
  onPress: () => void;
  testID: string;
}

function SheetRow({ icon, paper, label, hint, busy = false, disabled = false, last = false, onPress, testID }: SheetRowProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      accessibilityState={{ disabled, busy }}
      style={({ pressed }) => [styles.row, !last && styles.divider, pressed && styles.pressed]}
    >
      <IconTile icon={icon} paper={paper} />
      <View style={styles.texts}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      {busy ? <ActivityIndicator color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  error: { marginBottom: spacing.md },
  mode: { marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.rowHeight,
    paddingVertical: spacing.sm,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  divider: { borderBottomWidth: layout.hairline, borderBottomColor: colors.rule },
  // Ayraç düz kalsın diye yuvarlak vurgu yalnızca basılıyken.
  pressed: { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm, borderBottomColor: 'transparent' },
  texts: { flex: 1, gap: spacing.xxs },
});
