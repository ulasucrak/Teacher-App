import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import { Banner, BottomActionBar, Button, EmptyState, SearchField, Text } from '@/components/ui';
import { colors, layout, spacing } from '@/theme';
import type { StudentRow } from '@/types/database';

import { getEntry } from '../draft';
import type { SessionFill } from '../hooks/useSessionFill';
import { BulkApplyRow } from './BulkApplyRow';
import { NoteSheet } from './NoteSheet';
import { StudentEntryRow } from './StudentEntryRow';
import { UndoBar } from './UndoBar';

/** Bu kadar ve daha fazla öğrencide arama alanı gösterilir. */
export const SEARCH_MIN_STUDENTS = 12;

interface SessionFillBodyProps {
  fill: SessionFill;
  classId: string;
  formId: string;
  /** Alt çubuk yoksa geri alma bandının güvenli alan payı. */
  undoBottom?: number;
}

/** Kaydı doldurma listesi: arama, "Tümü", öğrenci satırları, geri alma bandı ve not paneli. */
export function SessionFillBody({ fill, classId, formId, undoBottom }: SessionFillBodyProps) {
  const router = useRouter();
  const { options, students, visibleStudents, query, saving } = fill;

  // Hiçbir öğrencinin numarası yoksa boş numara sütunu ayrılmaz.
  const hasNumbers = students.some((s) => Boolean(s.number?.trim()));

  const renderItem: ListRenderItem<StudentRow> = ({ item, index }) => (
    <StudentEntryRow
      student={item}
      index={index}
      entry={getEntry(fill.draft, item.id)}
      options={options}
      dirty={fill.dirtyIds.has(item.id)}
      disabled={saving}
      showNumbers={hasNumbers}
      onToggle={fill.onToggle}
      onOpenNote={fill.onOpenNote}
    />
  );

  const listHeader = (
    <View style={styles.listHeader}>
      {students.length >= SEARCH_MIN_STUDENTS ? (
        <SearchField
          value={query}
          onChangeText={fill.setQuery}
          placeholder="Ad ya da numara"
          accessibilityLabel="Öğrenci ara"
          testID="fill-search"
        />
      ) : null}
      {options.length === 0 ? (
        <View style={styles.stateWrap}>
          <Banner kind="warning" message="Bu formda seçenek yok. Formu düzenleyip seçenek ekleyin." />
          <Button
            label="Formu düzenle"
            variant="secondary"
            testID="fill-edit-form"
            onPress={() => router.push(`/class/${classId}/form/${formId}/edit`)}
          />
        </View>
      ) : students.length > 0 && !query ? (
        <BulkApplyRow options={options} uniformOption={fill.uniformOption} onApply={fill.onBulkApply} disabled={saving} showNumbers={hasNumbers} />
      ) : null}
    </View>
  );

  const listEmpty =
    students.length === 0 ? (
      <View style={styles.padded}>
        <EmptyState
          icon="people"
          title="Bu sınıfta öğrenci yok"
          description="Öğrenci ekleyince listeyi buradan işaretlersiniz."
          actionLabel="Öğrenci ekle"
          actionTestID="fill-add-students"
          onAction={() => router.push(`/class/${classId}/students`)}
        />
      </View>
    ) : (
      <View style={styles.padded}>
        <Text variant="body" tone="muted" testID="fill-no-match">
          “{query.trim()}” ile eşleşen öğrenci yok.
        </Text>
      </View>
    );

  const noteStudent = fill.noteStudentId ? students.find((s) => s.id === fill.noteStudentId) : undefined;

  return (
    <>
      <FlatList
        data={visibleStudents as StudentRow[]}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        extraData={fill.draft}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={options.length > 0 ? listEmpty : null}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        contentContainerStyle={styles.listContent}
        testID="fill-list"
      />
      <UndoBar message={fill.undoMessage} onUndo={fill.onUndo} onDismiss={fill.onDismissUndo} bottom={undoBottom} />
      <NoteSheet
        visible={noteStudent !== undefined}
        studentName={noteStudent?.full_name ?? ''}
        initialNote={noteStudent ? getEntry(fill.draft, noteStudent.id).note : null}
        onClose={() => fill.setNoteStudentId(null)}
        onSave={(note) => {
          if (fill.noteStudentId) fill.dispatch({ type: 'setNote', studentId: fill.noteStudentId, note });
          fill.setNoteStudentId(null);
        }}
      />
    </>
  );
}

/** "Kaydet" çubuğu; doldurulacak bir şey yoksa (seçenek ya da öğrenci yok) alt çubuk gösterilmez. */
export function sessionFillFooter(fill: SessionFill) {
  const canFill = fill.options.length > 0 && fill.students.length > 0;
  if (!canFill) return undefined;
  return (
    <BottomActionBar
      hint={fill.dirtyCount > 0 ? `${fill.dirtyCount} öğrencide kaydedilmemiş değişiklik` : undefined}
      primary={{
        label: 'Kaydet',
        onPress: () => void fill.onSave(),
        loading: fill.saving,
        disabled: fill.dirtyCount === 0,
        accessibilityHint: fill.dirtyCount === 0 ? 'Kaydedilmemiş değişiklik yok' : undefined,
        testID: 'save-button',
      }}
    />
  );
}

const styles = StyleSheet.create({
  listHeader: {
    paddingHorizontal: layout.pageX,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm },
  padded: { paddingHorizontal: layout.pageX, paddingVertical: spacing.lg },
  listContent: { paddingBottom: spacing.huge + spacing.xxxl },
});
