import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import {
  Banner,
  BottomActionBar,
  Button,
  ConfirmSheet,
  EmptyState,
  IconButton,
  LoadingState,
  OverflowMenu,
  Screen,
  SearchField,
  Text,
  useToast,
  type OverflowAction,
} from '@/components/ui';
import { colors, layout, spacing } from '@/theme';
import type { FormEntryRow, FormRow, FormSessionRow, StudentRow } from '@/types/database';

import {
  deleteSession,
  ensureSessionForDate,
  findSessionByDate,
  getForm,
  getSession,
  listEntries,
  listStudents,
  toUserMessage,
  updateSessionStatus,
  upsertEntries,
} from '../api';
import { BulkApplyRow } from '../components/BulkApplyRow';
import { NoteSheet } from '../components/NoteSheet';
import { StudentEntryRow } from '../components/StudentEntryRow';
import { UndoBar } from '../components/UndoBar';
import { formatDayLabel, isIsoDate, todayIso } from '../date';
import {
  buildUpsertPayload,
  countByOption,
  draftReducer,
  getDirtyStudentIds,
  getEntry,
  getUniformOption,
  initialDraftState,
} from '../draft';
import { NEW_SESSION_ID } from '../routes';
import { filterStudents, sortStudents } from '../students';

/** Bu kadar ve daha fazla öğrencide arama alanı gösterilir. */
export const SEARCH_MIN_STUDENTS = 12;

interface Loaded {
  form: FormRow;
  /** null → bu gün için henüz kayıt yok; ilk "Kaydet"te oluşturulur. */
  session: FormSessionRow | null;
  date: string;
  students: StudentRow[];
}

type Params = { classId: string; formId: string; sessionId: string; date?: string };

async function loadScreen(formId: string, sessionId: string, classId: string, dateParam: string | undefined) {
  if (sessionId === NEW_SESSION_ID) {
    const date = dateParam && isIsoDate(dateParam) ? dateParam : todayIso();
    const [form, session, students] = await Promise.all([
      getForm(formId),
      findSessionByDate(formId, date),
      listStudents(classId),
    ]);
    const entries: FormEntryRow[] = session ? await listEntries(session.id) : [];
    return { form, session, date, students, entries };
  }
  const [form, session, students, entries] = await Promise.all([
    getForm(formId),
    getSession(sessionId),
    listStudents(classId),
    listEntries(sessionId),
  ]);
  return { form, session, date: session.session_date, students, entries };
}

/** Bir günün kaydını doldurma ekranı: kompakt öğrenci satırları, "Tümü", altta "Kaydet". */
export function SessionFillScreen() {
  const { classId, formId, sessionId, date: dateParam } = useLocalSearchParams<Params>();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();

  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, dispatch] = useReducer(draftReducer, initialDraftState);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [noteStudentId, setNoteStudentId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- Yükleme ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    loadScreen(formId, sessionId, classId, dateParam)
      .then(({ form, session, date, students, entries }) => {
        if (cancelled) return;
        if (session && session.form_id !== formId) {
          setLoadError('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.');
          return;
        }
        setData({ form, session, date, students: sortStudents(students) });
        dispatch({ type: 'load', entries });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(toUserMessage(error, 'Kayıt yüklenemedi. Tekrar deneyin.'));
      });
    return () => {
      cancelled = true;
    };
  }, [classId, formId, sessionId, dateParam, reloadKey]);

  // --- Türetilmiş durum ------------------------------------------------------
  const options = useMemo(() => data?.form.options ?? [], [data]);
  const students = useMemo(() => data?.students ?? [], [data]);
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const visibleStudents = useMemo(() => filterStudents(students, query), [students, query]);
  const dirtyIds = useMemo(() => new Set(getDirtyStudentIds(state)), [state]);
  const dirtyCount = dirtyIds.size;
  const summary = useMemo(() => countByOption(state, studentIds, options), [state, studentIds, options]);
  const uniformOption = useMemo(() => getUniformOption(state, studentIds), [state, studentIds]);

  // --- Kaydedilmemiş değişiklik koruması (sistem Alert'i yalnızca burada) ----
  const dirtyRef = useRef(0);
  useEffect(() => {
    dirtyRef.current = dirtyCount;
  }, [dirtyCount]);
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current || dirtyRef.current === 0) return;
      event.preventDefault();
      const n = dirtyRef.current;
      Alert.alert('Değişiklikler kaydedilmedi', `Çıkarsanız ${n} öğrencideki değişiklik kaybolur.`, [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaydetmeden çık',
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });
    return unsubscribe;
  }, [navigation]);

  // iOS'ta kaydırarak geri dönüş beforeRemove ile durdurulamaz: değişiklik varken kapalı.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: dirtyCount === 0 });
  }, [navigation, dirtyCount]);

  // --- Eylemler --------------------------------------------------------------
  const onToggle = useCallback((studentId: string, optionKey: string) => {
    dispatch({ type: 'toggle', studentId, optionKey });
  }, []);

  const onOpenNote = useCallback((studentId: string) => setNoteStudentId(studentId), []);

  const onBulkApply = useCallback(
    (optionKey: string | null) => dispatch({ type: 'bulkApply', studentIds, optionKey }),
    [studentIds],
  );

  const onUndo = useCallback(() => dispatch({ type: 'undoBulk' }), []);
  const onDismissUndo = useCallback(() => dispatch({ type: 'dismissUndo' }), []);

  const undoMessage = useMemo(() => {
    if (!state.undo) return null;
    const { optionKey, count } = state.undo;
    if (optionKey === null) return `${count} öğrencinin seçimi temizlendi`;
    const label = options.find((o) => o.key === optionKey)?.label ?? optionKey;
    return `${count} öğrenci: ${label}`;
  }, [state.undo, options]);

  const onSave = async () => {
    if (!data || saving) return;
    setSaving(true);
    try {
      let session = data.session;
      let createdNow = false;
      if (!session) {
        const result = await ensureSessionForDate({ formId, sessionDate: data.date });
        session = result.session;
        createdNow = result.created;
      }
      const payload = buildUpsertPayload(state, session.id);
      try {
        await upsertEntries(payload);
      } catch (error) {
        // Yeni oluşturulan kayıt boş kalmasın: ilk kaydetme başarısızsa geri alınır.
        if (createdNow) await deleteSession(session.id).catch(() => undefined);
        else if (!data.session) {
          const existing = session;
          setData((d) => (d ? { ...d, session: existing } : d));
        }
        throw error;
      }
      if (!data.session) {
        const saved = session;
        setData((d) => (d ? { ...d, session: saved } : d));
      }
      dispatch({ type: 'saved', entries: payload });
      if (session.status === 'draft') {
        // Eski taslak kayıtlar kaydedilince yayına alınır (taslak arayüzü kaldırıldı).
        const published = await updateSessionStatus(session.id, 'published').catch(() => null);
        if (published) setData((d) => (d ? { ...d, session: published } : d));
      }
      toast.show('Kaydedildi');
    } catch (error) {
      toast.show(toUserMessage(error, 'Değişiklikler kaydedilemedi. Tekrar kaydedin.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const session = data?.session;
    if (!session) return;
    setDeleting(true);
    try {
      await deleteSession(session.id);
      allowLeaveRef.current = true;
      setConfirmDelete(false);
      toast.show('Kayıt silindi');
      router.back();
    } catch (error) {
      toast.show(toUserMessage(error, 'Kayıt silinemedi. Tekrar deneyin.'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const noteStudent = noteStudentId ? students.find((s) => s.id === noteStudentId) : undefined;

  const renderItem = useCallback<ListRenderItem<StudentRow>>(
    ({ item, index }) => (
      <StudentEntryRow
        student={item}
        index={index}
        entry={getEntry(state.draft, item.id)}
        options={options}
        dirty={dirtyIds.has(item.id)}
        disabled={saving}
        onToggle={onToggle}
        onOpenNote={onOpenNote}
      />
    ),
    [state.draft, options, dirtyIds, saving, onToggle, onOpenNote],
  );

  // --- Durumlar --------------------------------------------------------------
  if (loadError) {
    return (
      <Screen title="Kayıt" testID="fill-screen">
        <View style={styles.stateWrap}>
          <Banner kind="error" message={loadError} />
          <Button
            label="Tekrar dene"
            variant="secondary"
            testID="fill-retry"
            onPress={() => {
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Kayıt" scroll={false} testID="fill-screen">
        <LoadingState label="Öğrenciler yükleniyor" />
      </Screen>
    );
  }

  const { form, session } = data;
  const dateLabel = formatDayLabel(data.date);
  const filled = students.length - summary.empty;
  const canFill = options.length > 0 && students.length > 0;

  const menuActions: OverflowAction[] = [
    {
      key: 'edit',
      label: 'Formu düzenle',
      icon: 'edit',
      onPress: () => router.push(`/class/${classId}/form/${formId}/edit`),
    },
  ];
  if (session) {
    menuActions.push({
      key: 'delete',
      label: 'Kaydı sil',
      icon: 'trash',
      destructive: true,
      onPress: () => setConfirmDelete(true),
    });
  }

  const listHeader = (
    <View style={styles.listHeader}>
      {students.length >= SEARCH_MIN_STUDENTS ? (
        <SearchField
          value={query}
          onChangeText={setQuery}
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
        <BulkApplyRow options={options} uniformOption={uniformOption} onApply={onBulkApply} disabled={saving} />
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

  return (
    <Screen
      title={form.title}
      scroll={false}
      padded={false}
      testID="fill-screen"
      headerRight={
        <IconButton
          icon="more"
          accessibilityLabel="Diğer seçenekler"
          onPress={() => setMenuOpen(true)}
          testID="fill-more"
        />
      }
      footer={
        canFill ? (
          <BottomActionBar
            hint={dirtyCount > 0 ? `${dirtyCount} öğrencide kaydedilmemiş değişiklik` : undefined}
            primary={{
              label: 'Kaydet',
              onPress: () => void onSave(),
              loading: saving,
              disabled: dirtyCount === 0,
              accessibilityHint: dirtyCount === 0 ? 'Kaydedilmemiş değişiklik yok' : undefined,
              testID: 'save-button',
            }}
          />
        ) : undefined
      }
    >
      <View style={styles.metaRow}>
        <Text variant="label" tone="muted" accessibilityLabel={`Tarih: ${dateLabel}`} testID="fill-date">
          {dateLabel}
        </Text>
        {canFill ? (
          <Text
            variant="number"
            tone="muted"
            accessibilityLabel={`${students.length} öğrenciden ${filled} işaretli`}
            testID="fill-progress"
          >
            {`${filled}/${students.length}`}
          </Text>
        ) : null}
      </View>
      <FlatList
        data={visibleStudents as StudentRow[]}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
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
      <UndoBar message={undoMessage} onUndo={onUndo} onDismiss={onDismissUndo} />
      <NoteSheet
        visible={noteStudent !== undefined}
        studentName={noteStudent?.full_name ?? ''}
        initialNote={noteStudent ? getEntry(state.draft, noteStudent.id).note : null}
        onClose={() => setNoteStudentId(null)}
        onSave={(note) => {
          if (noteStudentId) dispatch({ type: 'setNote', studentId: noteStudentId, note });
          setNoteStudentId(null);
        }}
      />
      <OverflowMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={form.title}
        actions={menuActions}
        testID="fill-menu"
      />
      <ConfirmSheet
        visible={confirmDelete}
        title="Bu kayıt silinsin mi?"
        message={`${dateLabel} kaydındaki tüm işaretlemeler silinir.`}
        confirmLabel="Kaydı sil"
        loading={deleting}
        onConfirm={() => void onDelete()}
        onCancel={() => setConfirmDelete(false)}
        testID="fill-delete-confirm"
      />
    </Screen>
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
