import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Banner,
  Button,
  EmptyState,
  Icon,
  IconButton,
  ListRow,
  LoadingState,
  Screen,
  Sheet,
  Text,
  useToast,
} from '@/components/ui';
import {
  addStudent,
  deleteStudents,
  filterStudents,
  listStudents,
  SearchField,
  SelectBox,
  sortStudents,
  StudentFormSheet,
  updateStudent,
  type StudentSubmitResult,
  type ValidStudent,
} from '@/features/students';
import type { StudentRow } from '@/types/database';
import { colors, iconSize, layout, spacing } from '@/theme';

import { deleteClass, getClass } from '../api';
import { EntryCard } from '../components/EntryCard';
import { toUserMessage } from '../errors';
import { classMetaParts } from '../model';
import { useRemoteData } from '../useRemoteData';

const CLASS_ERROR = 'Sınıf açılamadı. Bağlantınızı kontrol edip tekrar deneyin.';
const STUDENTS_ERROR = 'Öğrenci listesi yüklenemedi. Aşağı çekerek yenileyin.';

interface EditorState {
  key: number;
  open: boolean;
  student: StudentRow | null;
}

/** `/class/[classId]`: sınıf başlığı, Formlar ve fotoğraftan ekleme girişleri, öğrenci listesi. */
export function ClassDetailScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const toast = useToast();

  const loadClass = useCallback(() => getClass(classId), [classId]);
  const loadStudents = useCallback(() => listStudents(classId), [classId]);
  const cls = useRemoteData(loadClass, CLASS_ERROR);
  const students = useRemoteData(loadStudents, STUDENTS_ERROR);

  const [query, setQuery] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editor, setEditor] = useState<EditorState>({ key: 0, open: false, student: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingClass, setDeletingClass] = useState(false);

  const all = useMemo(() => students.data ?? [], [students.data]);
  const visible = useMemo(() => filterStudents(all, query), [all, query]);

  const setStudentCount = (count: number) =>
    cls.setData((c) => (c ? { ...c, studentCount: count } : c));

  const replaceStudents = (next: StudentRow[]) => {
    const sorted = sortStudents(next);
    students.setData(sorted);
    setStudentCount(sorted.length);
  };

  // ----- Öğrenci ekle / düzenle -----

  const openEditor = (student: StudentRow | null) =>
    setEditor((e) => ({ key: e.key + 1, open: true, student }));
  const closeEditor = () => setEditor((e) => ({ ...e, open: false }));

  const submitStudent = async (value: ValidStudent): Promise<StudentSubmitResult> => {
    const editing = editor.student;
    try {
      if (editing) {
        const updated = await updateStudent(editing.id, value);
        replaceStudents(all.map((s) => (s.id === updated.id ? updated : s)));
        toast.show('Kaydedildi');
      } else {
        const created = await addStudent(classId, value);
        replaceStudents([...all, created]);
        toast.show(`${created.full_name} eklendi`);
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: toUserMessage(
          err,
          editing
            ? 'Değişiklikler kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.'
            : 'Öğrenci eklenemedi. Bilgileri kontrol edip tekrar deneyin.',
        ),
      };
    }
  };

  // ----- Silme -----

  const removeStudents = async (ids: string[]) => {
    setBusy(true);
    try {
      await deleteStudents(ids);
      const gone = new Set(ids);
      replaceStudents(all.filter((s) => !gone.has(s.id)));
      setSelected(new Set());
      setSelecting(false);
      toast.show(ids.length === 1 ? 'Öğrenci silindi' : `${ids.length} öğrenci silindi`);
      return true;
    } catch (err) {
      toast.show(toUserMessage(err, 'Öğrenciler silinemedi. Bağlantınızı kontrol edip tekrar deneyin.'), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteOne = (student: StudentRow) => {
    Alert.alert(
      `${student.full_name} silinsin mi?`,
      'Öğrencinin formlardaki tüm kayıtları da silinir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Öğrenciyi sil',
          style: 'destructive',
          onPress: async () => {
            if (await removeStudents([student.id])) closeEditor();
          },
        },
      ],
    );
  };

  const confirmDeleteSelected = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    Alert.alert(
      `${ids.length} öğrenci silinsin mi?`,
      'Bu öğrencilerin formlardaki tüm kayıtları da silinir. Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Öğrencileri sil', style: 'destructive', onPress: () => void removeStudents(ids) },
      ],
    );
  };

  const confirmDeleteClass = () => {
    const c = cls.data;
    if (!c) return;
    // Uyarı açık panelin üstünde gösterilir; panel karar verilince kapanır (iOS'ta kapanan
    // modalın üstüne açılan uyarı kaybolabiliyor).
    Alert.alert(
      `${c.name} sınıfı silinsin mi?`,
      `Sınıftaki ${c.studentCount} öğrenci, ${c.formCount} form ve bu formlara girilen tüm kayıtlar da silinir. Bu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sınıfı sil',
          style: 'destructive',
          onPress: async () => {
            // Panel açık kalır ve "Sınıfı sil" silme bitene kadar yükleniyor gösterir.
            setDeletingClass(true);
            try {
              await deleteClass(c.id);
              setMenuOpen(false);
              toast.show(`${c.name} silindi`);
              if (router.canGoBack()) router.back();
              else router.replace('/');
            } catch (err) {
              toast.show(toUserMessage(err, 'Sınıf silinemedi. Bağlantınızı kontrol edip tekrar deneyin.'), 'error');
            } finally {
              setDeletingClass(false);
            }
          },
        },
      ],
    );
  };

  // ----- Seçim -----

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id));
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of visible) {
        if (allVisibleSelected) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });

  // Arama değişince seçim temizlenir: gizlenen öğrenciler toplu silmeye karışmasın.
  const changeQuery = (text: string) => {
    setQuery(text);
    setSelected((prev) => (prev.size > 0 ? new Set() : prev));
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const refreshAll = async () => {
    await Promise.all([cls.refresh(), students.refresh()]);
  };

  // ----- Durumlar -----

  if (cls.status === 'loading' || (cls.status === 'ready' && students.status === 'loading')) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Sınıf açılıyor" />
      </Screen>
    );
  }

  if (cls.status === 'error' || !cls.data) {
    return (
      <Screen title="Sınıf" contentStyle={styles.errorBox}>
        <Banner kind="error" title="Sınıf açılamadı" message={cls.error ?? CLASS_ERROR} />
        <Button label="Tekrar dene" variant="secondary" onPress={cls.retry} />
        <Button label="Sınıflarıma dön" variant="ghost" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const c = cls.data;
  const meta = classMetaParts(c);
  const count = all.length;
  const studentsFailed = students.status === 'error';

  const header = (
    <View style={styles.header}>
      {meta.length > 0 ? (
        <View style={styles.meta}>
          {meta.map((part) => (
            <Text key={part} variant="caption" tone="muted">
              {part}
            </Text>
          ))}
        </View>
      ) : null}
      {cls.error ? <Banner kind="error" message={cls.error} /> : null}

      <View style={styles.entries}>
        <EntryCard
          icon="book"
          title="Formlar"
          description={c.formCount > 0 ? `${c.formCount} form` : 'Yoklama, ödev kontrolü ve sözlü formu oluşturun'}
          onPress={() => router.push(`/class/${c.id}/forms`)}
          accessibilityHint="Sınıfın formlarını açar"
        />
        <EntryCard
          icon="camera"
          variant="muted"
          title="Fotoğraftan öğrenci ekle"
          description="Sınıf listesinin fotoğrafını çekin; adlar ve numaralar okunur"
          onPress={() => router.push(`/class/${c.id}/import`)}
          accessibilityHint="Kamerayı ya da fotoğraf seçiciyi açar"
        />
      </View>

      <View style={styles.sectionHead}>
        <View style={styles.sectionTitle}>
          <Text variant="heading" accessibilityRole="header">
            Öğrenciler
          </Text>
          {count > 0 ? (
            <Text variant="caption" tone="muted">
              {`${count} öğrenci`}
            </Text>
          ) : null}
        </View>
        {count > 0 ? (
          selecting ? (
            <Button
              label={allVisibleSelected ? 'Seçimi kaldır' : 'Tümünü seç'}
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={toggleAllVisible}
            />
          ) : (
            <Button
              label="Seç"
              variant="ghost"
              size="sm"
              fullWidth={false}
              accessibilityLabel="Silmek için öğrenci seç"
              onPress={() => setSelecting(true)}
            />
          )
        ) : null}
      </View>

      {studentsFailed || (students.error && count > 0) ? (
        <Banner kind="error" message={students.error ?? STUDENTS_ERROR} />
      ) : null}
      {studentsFailed ? <Button label="Tekrar dene" variant="secondary" onPress={students.retry} /> : null}

      {count > 0 ? (
        <SearchField
          value={query}
          onChangeText={changeQuery}
          placeholder="Ad ya da numara ile arayın"
          accessibilityLabel="Öğrenci ara"
        />
      ) : null}
    </View>
  );

  const empty = studentsFailed ? null : count === 0 ? (
    <View style={styles.padded}>
      <EmptyState
        icon="people"
        title="Bu sınıfta henüz öğrenci yok"
        description="Formlarda işaretleme bu listeyle yapılır. Sınıf listesinin fotoğrafından toplu ekleyebilir ya da öğrencileri tek tek girebilirsiniz."
        actionLabel="Öğrenci ekle"
        onAction={() => openEditor(null)}
      />
    </View>
  ) : (
    <View style={[styles.padded, styles.noMatch]}>
      <Text variant="body" tone="muted">
        {`"${query.trim()}" ile eşleşen öğrenci yok. Yazımı kontrol edin ya da numarayla arayın.`}
      </Text>
    </View>
  );

  const footer =
    count === 0 ? undefined : selecting ? (
      <View style={styles.footerRow}>
        <Button label="Vazgeç" variant="secondary" onPress={stopSelecting} fullWidth={false} style={styles.footerSide} />
        <Button
          label={selected.size > 0 ? `${selected.size} öğrenciyi sil` : 'Öğrenci seçin'}
          variant="destructive"
          icon="trash"
          disabled={selected.size === 0}
          loading={busy}
          onPress={confirmDeleteSelected}
          fullWidth={false}
          style={styles.footerMain}
        />
      </View>
    ) : (
      <Button label="Öğrenci ekle" icon="plus" onPress={() => openEditor(null)} />
    );

  return (
    <Screen
      title={c.name}
      scroll={false}
      padded={false}
      headerDivider
      headerRight={
        <IconButton icon="more" accessibilityLabel="Sınıf seçenekleri" onPress={() => setMenuOpen(true)} />
      }
      footer={footer}
    >
      <FlatList
        data={visible}
        keyExtractor={(s) => s.id}
        extraData={selecting ? selected : null}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={cls.refreshing || students.refreshing}
            onRefresh={refreshAll}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const numberPart = item.number ? `, numara ${item.number}` : '';
          return (
            <ListRow
              title={item.full_name}
              number={item.number}
              ruled
              leading={<Avatar name={item.full_name} size="sm" imageUri={item.photo_url} />}
              trailing={
                selecting ? (
                  <SelectBox checked={isSelected} />
                ) : (
                  <Icon name="edit" size={iconSize.md} color={colors.textMuted} />
                )
              }
              showChevron={false}
              onPress={() => (selecting ? toggle(item.id) : openEditor(item))}
              accessibilityLabel={
                selecting
                  ? `${item.full_name}${numberPart}, ${isSelected ? 'seçili' : 'seçili değil'}`
                  : `${item.full_name}${numberPart}`
              }
              accessibilityHint={selecting ? 'Seçimi değiştirir' : 'Öğrenciyi düzenler'}
            />
          );
        }}
      />

      <StudentFormSheet
        key={editor.key}
        visible={editor.open}
        onClose={closeEditor}
        student={editor.student}
        classmates={all}
        onSubmit={submitStudent}
        onDelete={editor.student ? () => confirmDeleteOne(editor.student!) : undefined}
        deleting={busy}
      />

      <Sheet visible={menuOpen} onClose={() => (deletingClass ? undefined : setMenuOpen(false))} title={c.name}>
        <View style={styles.menu}>
          <Button
            label="Sınıfı düzenle"
            variant="secondary"
            icon="edit"
            disabled={deletingClass}
            onPress={() => {
              setMenuOpen(false);
              router.push({ pathname: '/class/new', params: { classId: c.id } });
            }}
          />
          <Button
            label="Sınıfı sil"
            variant="destructive"
            icon="trash"
            onPress={confirmDeleteClass}
            loading={deletingClass}
          />
          <Text variant="caption" tone="muted">
            Sınıfı silmek öğrencilerini, formlarını ve tüm kayıtlarını da siler.
          </Text>
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: layout.pageX, paddingTop: spacing.md, paddingBottom: spacing.md, gap: spacing.lg },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  entries: { gap: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    minHeight: layout.minTouch,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  padded: { paddingHorizontal: layout.pageX },
  noMatch: { paddingVertical: spacing.xxl },
  listContent: { flexGrow: 1, paddingBottom: spacing.xxl },
  errorBox: { gap: spacing.lg, paddingTop: spacing.lg },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  footerSide: { flexShrink: 0 },
  footerMain: { flex: 1 },
  menu: { gap: spacing.md },
});
