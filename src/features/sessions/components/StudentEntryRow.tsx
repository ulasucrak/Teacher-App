import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, IconButton, ListRow, OptionGrid, Text } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';
import type { FormOption, StudentRow } from '@/types/database';

import type { EntryValue } from '../draft';

export interface StudentEntryRowProps {
  student: Pick<StudentRow, 'id' | 'full_name' | 'number' | 'photo_url'>;
  /** Sınıf adı ("5/B"). */
  classLabel: string | null;
  entry: EntryValue;
  options: readonly FormOption[];
  /** Kaydedilmemiş değişiklik var mı (satır başında küçük işaret). */
  dirty: boolean;
  disabled?: boolean;
  onToggle: (studentId: string, optionKey: string) => void;
  onOpenNote: (studentId: string) => void;
}

/**
 * Bir öğrencinin defter satırı: numara + kırmızı kenar çizgisi, avatar, ad, not düğmesi
 * ve 3 sütunlu seçenek ızgarası. 40+ satırlık listede `memo` ile yalnızca değişen satır çizilir.
 */
export const StudentEntryRow = memo(function StudentEntryRow({
  student,
  classLabel,
  entry,
  options,
  dirty,
  disabled,
  onToggle,
  onOpenNote,
}: StudentEntryRowProps) {
  const hasNote = Boolean(entry.note);
  return (
    <ListRow
      title={student.full_name}
      subtitle={classLabel ?? undefined}
      number={student.number ?? undefined}
      ruled
      leading={<Avatar name={student.full_name} imageUri={student.photo_url} />}
      trailing={
        <View>
          <IconButton
            icon="note"
            accessibilityLabel={hasNote ? `${student.full_name} notunu düzenle` : `${student.full_name} için not ekle`}
            onPress={() => onOpenNote(student.id)}
            color={hasNote ? colors.primary : colors.textMuted}
            style={hasNote ? styles.noteFilled : undefined}
          />
          {dirty ? (
            <View
              style={styles.dirtyDot}
              accessible
              accessibilityLabel="Kaydedilmemiş değişiklik"
              testID={`dirty-${student.id}`}
            />
          ) : null}
        </View>
      }
    >
      <OptionGrid
        options={options}
        value={entry.optionKey}
        disabled={disabled}
        contextLabel={student.full_name}
        onChange={(key) => onToggle(student.id, key)}
      />
      {entry.note ? (
        <Text variant="caption" tone="muted" numberOfLines={2} style={styles.note}>
          {entry.note}
        </Text>
      ) : null}
    </ListRow>
  );
});

const styles = StyleSheet.create({
  noteFilled: { backgroundColor: colors.primaryMuted },
  dirtyDot: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    borderWidth: layout.inputBorder,
    borderColor: colors.surface,
  },
  note: { marginTop: spacing.sm },
});
