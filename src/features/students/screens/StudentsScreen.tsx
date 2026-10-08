import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Banner,
  BottomActionBar,
  Button,
  ConfirmSheet,
  EmptyState,
  IconButton,
  ListRow,
  LoadingState,
  OverflowMenu,
  Pill,
  Screen,
  SearchField,
  Text,
  useToast,
  type OverflowAction,
} from '@/components/ui';
import { toUserMessage } from '@/features/classes/errors';
import { useRemoteData } from '@/features/classes/useRemoteData';
import { colors, layout, spacing } from '@/theme';
import type { StudentRow } from '@/types/database';

import { deleteStudents, listStudents, updateStudent } from '../api';
import { SelectBox } from '../components/SelectBox';
import { StudentFormSheet, type StudentSubmitResult } from '../components/StudentFormSheet';
import { filterStudents, sortStudents, type ValidStudent } from '../model';

const LOAD_ERROR = 'Öğrenciler yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.';

type AddMethod = 'photo' | 'paste' | 'type';

export interface StudentsScreenProps {
  classId: string;
}

interface EditorState {
  key: number;
  open: boolean;
  student: StudentRow | null;
}

/**
 * `/class/[classId]/students` — öğrencileri yönetme (ara, düzenle, sil, ekle). Sınıf ekranındaki
 * "Öğrenciler (N)" satırından açılır; ekleme ve toplu silme "⋯" menüsünde.
 */
export function StudentsScreen({ classId }: StudentsScreenProps) {
  const router = useRouter();
  const toast = useToast();
  const load = useCallback(() => listStudents(classId), [classId]);
  const students = useRemoteData(load, LOAD_ERROR);

  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<EditorState>({ key: 0, open: false, student: null });
  /** Silinecekler (tek öğrenci düzenleme panelinden ya da seçimden). */
  const [toDelete, setToDelete] = useState<StudentRow[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deleteAfterSheet = useRef<StudentRow | null>(null);

  const all = useMemo(() => students.data ?? [], [students.data]);
  const visible = useMemo(() => filterStudents(all, query), [all, query]);
  const total = all.length;
  // Hiçbir öğrencinin numarası yoksa boş numara sütunu ayrılmaz (adlar sola yaslı, boşluk israfı yok).
  const hasNumbers = useMemo(() => all.some((s) => Boolean(s.number?.trim())), [all]);

  const openAdd = (method: AddMethod) => router.push(`/class/${classId}/import?method=${method}`);

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saveStudent = async (value: ValidStudent): Promise<StudentSubmitResult> => {
    const current = editor.student;
    if (!current) return { ok: false, message: 'Öğrenci bulunamadı.' };
    try {
      const updated = await updateStudent(current.id, value);
      students.setData((prev) => sortStudents((prev ?? []).map((s) => (s.id === updated.id ? updated : s))));
      toast.show('Kaydedildi');
      return { ok: true };
    } catch (err) {
      return { ok: false, message: toUserMessage(err, 'Öğrenci kaydedilemedi. Tekrar deneyin.') };
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      const ids = toDelete.map((s) => s.id);
      await deleteStudents(ids);
      students.setData((prev) => (prev ?? []).filter((s) => !ids.includes(s.id)));
      toast.show(toDelete.length === 1 ? `${toDelete[0].full_name} silindi` : `${toDelete.length} öğrenci silindi`);
      setToDelete(null);
      stopSelecting();
    } catch (err) {
      toast.show(toUserMessage(err, 'Öğrenciler silinemedi. Tekrar deneyin.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const menuActions: OverflowAction[] = [
    { key: 'add', label: 'Öğrenci ekle', icon: 'plus', onPress: () => setAddOpen(true), testID: 'students-menu-add' },
    {
      key: 'select',
      label: 'Öğrenci seç',
      description: 'Birden çok öğrenciyi silmek için',
      icon: 'checklist',
      disabled: total === 0,
      onPress: () => setSelecting(true),
      testID: 'students-menu-select',
    },
  ];

  const addActions: OverflowAction[] = [
    { key: 'photo', label: 'Fotoğraftan', icon: 'camera', onPress: () => openAdd('photo'), testID: 'students-add-photo' },
    { key: 'paste', label: 'Listeyi yapıştır', icon: 'paste', onPress: () => openAdd('paste'), testID: 'students-add-paste' },
    { key: 'type', label: 'Tek tek yaz', icon: 'keyboard', onPress: () => openAdd('type'), testID: 'students-add-type' },
  ];

  let body;
  if (students.status === 'loading') {
    body = <LoadingState label="Öğrenciler yükleniyor" />;
  } else if (students.status === 'error') {
    body = (
      <View style={[styles.padded, styles.errorBox]}>
        <Banner kind="error" title="Öğrenciler yüklenemedi" message={students.error ?? LOAD_ERROR} />
        <Button label="Tekrar dene" variant="secondary" onPress={students.retry} testID="students-retry" />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const checked = selected.has(item.id);
          return (
            <ListRow
              title={item.full_name}
              number={item.number}
              ruled={hasNumbers}
              leading={<Avatar name={item.full_name} size="sm" />}
              showChevron={false}
              onPress={
                selecting ? () => toggle(item.id) : () => setEditor((e) => ({ key: e.key + 1, open: true, student: item }))
              }
              trailing={selecting ? <SelectBox checked={checked} /> : undefined}
              accessibilityLabel={
                selecting
                  ? `${item.full_name}${checked ? ', seçili' : ''}`
                  : [item.number ? `${item.number} numara` : null, item.full_name].filter(Boolean).join(', ')
              }
              accessibilityHint={selecting ? 'Seçimi değiştirir' : 'Düzenler'}
              testID={`student-row-${index}`}
            />
          );
        }}
        ListHeaderComponent={
          total > 0 ? (
            <View style={[styles.padded, styles.listHead]}>
              {students.error ? <Banner kind="error" message={students.error} /> : null}
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Ad ya da numara"
                accessibilityLabel="Öğrenci ara"
                testID="students-search"
              />
              <Pill
                label={selecting ? `${selected.size} seçili` : `${total} öğrenci`}
                tone={selecting ? 'ink' : 'paper'}
                testID="students-count"
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          total === 0 ? (
            <View style={styles.padded}>
              <EmptyState
                icon="people"
                title="Henüz öğrenci yok"
                description="Sınıf listesinin fotoğrafını çekin ya da adları yazın."
                actionLabel="Öğrenci ekle"
                onAction={() => setAddOpen(true)}
                actionTestID="students-empty-add"
                testID="students-empty"
              />
            </View>
          ) : (
            <Text variant="bodySmall" tone="muted" style={styles.padded} testID="students-no-match">
              {`“${query.trim()}” ile eşleşen öğrenci yok.`}
            </Text>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={students.refreshing}
            onRefresh={students.refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            title="Yenileniyor"
          />
        }
        contentContainerStyle={styles.listContent}
        testID="students-list"
      />
    );
  }

  return (
    <Screen
      title="Öğrenciler"
      scroll={false}
      padded={false}
      testID="students-screen"
      headerRight={
        selecting ? undefined : (
          <IconButton
            icon="more"
            accessibilityLabel="Diğer seçenekler"
            onPress={() => setMenuOpen(true)}
            testID="students-menu"
          />
        )
      }
      footer={
        selecting ? (
          <BottomActionBar
            secondary={{ label: 'Vazgeç', onPress: stopSelecting, testID: 'students-select-cancel' }}
            primary={{
              label: selected.size > 0 ? `${selected.size} öğrenciyi sil` : 'Öğrenci seçin',
              variant: 'destructive',
              disabled: selected.size === 0,
              onPress: () => setToDelete(all.filter((s) => selected.has(s.id))),
              testID: 'students-delete-selected',
            }}
          />
        ) : undefined
      }
    >
      {body}

      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Öğrenciler"
        actions={menuActions}
        testID="students-menu-sheet"
      />
      <OverflowMenu
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        title="Öğrenci ekle"
        actions={addActions}
        testID="students-add-sheet"
      />

      <StudentFormSheet
        key={editor.key}
        visible={editor.open}
        onClose={() => setEditor((e) => ({ ...e, open: false }))}
        student={editor.student}
        classmates={all}
        onSubmit={saveStudent}
        onDelete={() => {
          deleteAfterSheet.current = editor.student;
          setEditor((e) => ({ ...e, open: false }));
        }}
        onDismissed={() => {
          const student = deleteAfterSheet.current;
          deleteAfterSheet.current = null;
          if (student) setToDelete([student]);
        }}
        testID="student-sheet"
      />

      <ConfirmSheet
        visible={toDelete !== null}
        title={
          toDelete && toDelete.length === 1
            ? `${toDelete[0].full_name} silinsin mi?`
            : `${toDelete?.length ?? 0} öğrenci silinsin mi?`
        }
        message="Öğrencinin form kayıtları da silinir."
        confirmLabel={toDelete && toDelete.length > 1 ? 'Öğrencileri sil' : 'Öğrenciyi sil'}
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
        testID="students-delete-confirm"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: layout.pageX },
  errorBox: { marginTop: spacing.lg, gap: spacing.lg },
  listHead: { gap: spacing.sm, paddingBottom: spacing.sm },
  listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
});
