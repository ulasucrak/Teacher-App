import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ChipGroup, IconButton, Text } from '@/components/ui';
import { colors, iconSize, layout, radii, spacing } from '@/theme';
import type { FormOption, StudentRow } from '@/types/database';

import type { EntryValue } from '../draft';

export interface StudentEntryRowProps {
  student: Pick<StudentRow, 'id' | 'full_name' | 'number'>;
  /** Görünen listedeki sıra (testID: `student-row-<index>`). */
  index: number;
  entry: EntryValue;
  options: readonly FormOption[];
  /** Kaydedilmemiş değişiklik var mı (adın yanında küçük nokta). */
  dirty: boolean;
  disabled?: boolean;
  onToggle: (studentId: string, optionKey: string) => void;
  onOpenNote: (studentId: string) => void;
}

/**
 * Kompakt doldurma satırı: numara + ad + soluk not ikonu; altında içerik genişliğinde çipler.
 * 40+ satırlık listede `memo` ile yalnızca değişen satır yeniden çizilir.
 */
export const StudentEntryRow = memo(function StudentEntryRow({
  student,
  index,
  entry,
  options,
  dirty,
  disabled,
  onToggle,
  onOpenNote,
}: StudentEntryRowProps) {
  const hasNote = Boolean(entry.note);
  const testID = `student-row-${index}`;
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.head}>
        <View style={styles.numberCol}>
          {student.number ? (
            <Text variant="number" tone="muted" align="right" numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {student.number}
            </Text>
          ) : null}
        </View>
        <Text variant="bodyStrong" numberOfLines={1} style={styles.name} testID={`${testID}-name`}>
          {student.full_name}
        </Text>
        {dirty ? (
          <View
            style={styles.dirtyDot}
            accessible
            accessibilityLabel="Kaydedilmemiş değişiklik"
            testID={`dirty-${student.id}`}
          />
        ) : null}
        <IconButton
          icon="note"
          size={iconSize.md}
          accessibilityLabel={hasNote ? `${student.full_name} notunu düzenle` : `${student.full_name} için not ekle`}
          onPress={() => onOpenNote(student.id)}
          disabled={disabled}
          color={hasNote ? colors.primary : colors.textMuted}
          testID={`${testID}-note`}
        />
      </View>
      <View style={styles.body}>
        <ChipGroup
          options={options}
          value={entry.optionKey}
          disabled={disabled}
          contextLabel={student.full_name}
          onChange={(key) => onToggle(student.id, key)}
          testIDPrefix={testID}
        />
        {entry.note ? (
          <Text variant="caption" tone="muted" numberOfLines={1} testID={`${testID}-note-text`}>
            {entry.note}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const INDENT = layout.numberColumn + spacing.md;

const styles = StyleSheet.create({
  row: {
    paddingLeft: layout.pageX,
    paddingRight: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    backgroundColor: colors.surface,
  },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: layout.minTouch },
  numberCol: { width: layout.numberColumn, marginRight: spacing.md },
  name: { flex: 1 },
  dirtyDot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.xs,
  },
  body: { marginLeft: INDENT, paddingRight: spacing.md, gap: spacing.xs },
});
