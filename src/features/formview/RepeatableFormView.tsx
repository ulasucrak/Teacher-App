import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banner, Button, EmptyState, LoadingState, OverflowMenu, SearchField, Text } from '@/components/ui';
import { totalCount, sumCounts, type StudentTally } from '@/features/history';
import { UndoBar } from '@/features/sessions/components/UndoBar';
import { formatDayLabel } from '@/features/sessions/date';
import { filterStudents } from '@/features/sessions/students';
import { colors, layout, spacing } from '@/theme';

import type { FormViewProps } from './DailyFormView';
import { FormShell, type FormTab } from './FormShell';
import { HistoryPane } from './HistoryPane';
import { MarkRow } from './MarkRow';
import { useMarkBoard } from './useMarkBoard';

/** Bu kadar ve daha fazla öğrencide arama alanı gösterilir. */
export const MARK_SEARCH_MIN_STUDENTS = 12;

/**
 * Birikimli form (aynı gün birden çok işaret): "İşaretle" öğrenci listesidir, her öğrencide
 * seçenek düğmeleri; tek dokunuş bir işaret ekler. "Geçmiş" özet ve zaman çizelgesidir.
 */
export function RepeatableFormView({ classId, form, initialTab }: FormViewProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const board = useMarkBoard(form);
  const { reload } = board;

  const [tab, setTab] = useState<FormTab>(initialTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Geçmişten ya da düzenlemeden dönünce sayılar güncel görünsün.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const { rows } = board;
  const visible = useMemo(() => {
    if (!rows) return [];
    const items = rows.map((row) => ({ row, number: row.number, full_name: row.fullName }));
    return filterStudents(items, query).map((item) => item.row);
  }, [rows, query]);
  const todayMarks = useMemo(() => (rows ? totalCount(sumCounts(rows.map((r) => r.dayCounts))) : 0), [rows]);

  const renderItem: ListRenderItem<StudentTally> = ({ item, index }) => (
    <MarkRow
      student={item}
      index={index}
      options={form.options}
      undoing={board.undoingIds.has(item.studentId)}
      onMark={board.mark}
      onUndo={board.undoStudent}
    />
  );

  let marking;
  if (board.loadError && !rows) {
    marking = (
      <View style={styles.stateWrap}>
        <Banner kind="error" message={board.loadError} />
        <Button label="Tekrar dene" variant="secondary" onPress={reload} testID="mark-retry" />
      </View>
    );
  } else if (!rows) {
    marking = <LoadingState label="Öğrenciler yükleniyor" />;
  } else {
    const dateLabel = formatDayLabel(board.today);
    marking = (
      <>
        <View style={styles.metaRow}>
          <Text variant="label" tone="muted" accessibilityLabel={`Tarih: ${dateLabel}`} testID="mark-date">
            {dateLabel}
          </Text>
          <Text variant="number" tone="muted" accessibilityLabel={`Bugün ${todayMarks} işaret verildi`} testID="mark-today-total">
            {`${todayMarks} işaret`}
          </Text>
        </View>
        <FlatList
          data={visible}
          keyExtractor={(r) => r.studentId}
          renderItem={renderItem}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {board.loadError ? <Banner kind="error" message={board.loadError} /> : null}
              {rows.length >= MARK_SEARCH_MIN_STUDENTS ? (
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Ad ya da numara"
                  accessibilityLabel="Öğrenci ara"
                  testID="mark-search"
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            rows.length === 0 ? (
              <View style={styles.padded}>
                <EmptyState
                  icon="people"
                  title="Bu sınıfta öğrenci yok"
                  description="Öğrenci ekleyince işaretleri buradan verirsiniz."
                  actionLabel="Öğrenci ekle"
                  actionTestID="mark-add-students"
                  onAction={() => router.push(`/class/${classId}/students`)}
                />
              </View>
            ) : (
              <View style={styles.padded}>
                <Text variant="body" tone="muted" testID="mark-no-match">
                  “{query.trim()}” ile eşleşen öğrenci yok.
                </Text>
              </View>
            )
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          contentContainerStyle={styles.listContent}
          testID="mark-list"
        />
        <UndoBar
          key={board.lastMark?.markId}
          message={tab === 'mark' ? (board.lastMark?.message ?? null) : null}
          onUndo={() => void board.undoLast()}
          onDismiss={board.dismissLast}
          bottom={insets.bottom + spacing.md}
        />
      </>
    );
  }

  return (
    <FormShell title={form.title} tab={tab} onTab={setTab} onMore={() => setMenuOpen(true)} testID="form-screen">
      {tab === 'mark' ? marking : null}
      <HistoryPane form={form} active={tab === 'history'} />
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={form.title}
        testID="form-menu"
        actions={[
          {
            key: 'edit',
            label: 'Formu düzenle',
            icon: 'edit',
            onPress: () => router.push(`/class/${classId}/form/${form.id}/edit`),
          },
        ]}
      />
    </FormShell>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: layout.pageX,
    paddingBottom: spacing.sm,
  },
  listHeader: { paddingHorizontal: layout.pageX, gap: spacing.md, paddingBottom: spacing.xs },
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm, paddingHorizontal: layout.pageX },
  padded: { paddingHorizontal: layout.pageX, paddingVertical: spacing.lg },
  listContent: { borderTopWidth: layout.hairline, borderTopColor: colors.rule, paddingBottom: spacing.huge + spacing.xxxl },
});
