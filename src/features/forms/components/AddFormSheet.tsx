import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Banner, IconTile, Sheet, Text, type IconName } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';

import { sameTitle } from '../format';
import { PRESETS, presetIcon, type PresetId } from '../presets';

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
  onPreset: (id: PresetId) => void;
  onCopyFromOther: () => void;
  onBlank: () => void;
}

/** "+ Form" paneli: hazır formlar tek dokunuşla eklenir; ardından kopyala ve boş form. */
export function AddFormSheet({
  visible,
  onClose,
  onDismissed,
  existingTitles,
  busyPreset = null,
  error,
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
      {PRESETS.map((p) => {
        const exists = existingTitles.some((t) => sameTitle(t, p.title));
        return (
          <SheetRow
            key={p.id}
            icon={presetIcon(p.id)}
            label={p.title}
            hint={exists ? 'Bu sınıfta var' : undefined}
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
  label: string;
  hint?: string;
  busy?: boolean;
  disabled?: boolean;
  last?: boolean;
  onPress: () => void;
  testID: string;
}

function SheetRow({ icon, label, hint, busy = false, disabled = false, last = false, onPress, testID }: SheetRowProps) {
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
      <IconTile icon={icon} />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.rowHeight,
    paddingVertical: spacing.sm,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
  },
  divider: { borderBottomWidth: layout.hairline, borderBottomColor: colors.rule },
  pressed: { backgroundColor: colors.surfaceMuted },
  texts: { flex: 1, gap: spacing.xxs },
});
