import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner, Button, Icon, LoadingState, selectionA11y, Sheet, Text } from '@/components/ui';
import { colors, iconSize, layout, radii, spacing } from '@/theme';

import { classLabel, type ClassSummary } from '../format';

interface ClassPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  formTitle: string;
  /** Hedef olabilecek sınıflar (formun kendi sınıfı hariç). `null` → yükleniyor. */
  classes: ClassSummary[] | null;
  loadError?: string | null;
  onRetry?: () => void;
  busy?: boolean;
  /** Kopyalama hatası (Sheet açıkken toast görünmez). */
  submitError?: string | null;
  onConfirm: (classIds: string[]) => void;
}

/** "Diğer sınıflara kopyala": çoklu sınıf seçimi + tümünü seç. */
export function ClassPickerSheet({
  visible,
  onClose,
  formTitle,
  classes,
  loadError,
  onRetry,
  busy = false,
  submitError,
  onConfirm,
}: ClassPickerSheetProps) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [wasVisible, setWasVisible] = useState(visible);

  // Her açılışta seçim sıfırlanır.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSelected(new Set());
  }

  const list = classes ?? [];
  const allSelected = list.length > 0 && list.every((c) => selected.has(c.id));
  const count = selected.size;

  const toggle = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(list.map((c) => c.id)));

  const footer =
    list.length > 0 ? (
      <Button
        label={count > 0 ? `${count} sınıfa kopyala` : 'Sınıf seçin'}
        icon="check"
        disabled={count === 0}
        loading={busy}
        onPress={() => onConfirm([...selected])}
        testID="copy-classes-confirm"
      />
    ) : undefined;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Diğer sınıflara kopyala"
      description={formTitle ? `${formTitle} seçtiğiniz sınıflara eklenir.` : undefined}
      footer={footer}
      testID="copy-classes-sheet"
    >
      {submitError ? (
        <View style={styles.submitError}>
          <Banner kind="error" message={submitError} />
        </View>
      ) : null}
      {loadError ? (
        <View style={styles.gap}>
          <Banner kind="error" message={loadError} />
          {onRetry ? <Button label="Tekrar dene" variant="secondary" fullWidth={false} onPress={onRetry} /> : null}
        </View>
      ) : classes === null ? (
        <View style={styles.loading}>
          <LoadingState label="Sınıflar yükleniyor" />
        </View>
      ) : list.length === 0 ? (
        <Banner
          kind="info"
          title="Başka sınıfınız yok"
          message="Kopyalamak için önce yeni bir sınıf ekleyin."
        />
      ) : (
        <View>
          <CheckRow label="Tümünü seç" checked={allSelected} onPress={toggleAll} strong testID="copy-class-all" />
          {list.map((c, index) => (
            <CheckRow
              key={c.id}
              label={classLabel(c)}
              checked={selected.has(c.id)}
              onPress={() => toggle(c.id)}
              testID={`copy-class-${index}`}
            />
          ))}
        </View>
      )}
    </Sheet>
  );
}

function CheckRow({
  label,
  checked,
  onPress,
  strong = false,
  testID,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  strong?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      {...selectionA11y({ checked })}
      style={({ pressed }) => [styles.row, strong && styles.rowStrong, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Icon name="check" size={iconSize.sm} color={colors.textInverse} /> : null}
      </View>
      <Text variant={strong ? 'label' : 'bodyStrong'} style={styles.rowLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const BOX = spacing.xxl;

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  submitError: { marginBottom: spacing.md },
  loading: { paddingVertical: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch + spacing.xs,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  rowStrong: { borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.pressedOverlay },
  rowLabel: { flex: 1 },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: radii.xs,
    borderWidth: layout.inputBorder,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
});
