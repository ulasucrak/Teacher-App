import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';

import {
  Banner,
  Button,
  EmptyState,
  IconButton,
  LoadingState,
  Screen,
  Text,
  TextField,
  useToast,
} from '@/components/ui';
import { colors, layout, spacing } from '@/theme';
import type { ClassRow, FormRow, FormSessionRow, StudentRow } from '@/types/database';

import {
  deleteSession,
  getClass,
  getForm,
  getSession,
  listEntries,
  listStudents,
  toUserMessage,
  updateSessionStatus,
  upsertEntries,
} from '../api';
import { BulkApplyCard } from '../components/BulkApplyCard';
import { FormHeaderCard } from '../components/FormHeaderCard';
import { NoteSheet } from '../components/NoteSheet';
import { OptionSummary } from '../components/OptionSummary';
import { StudentEntryRow } from '../components/StudentEntryRow';
import { UndoBar } from '../components/UndoBar';
import { formatSessionDate } from '../date';
import {
  buildUpsertPayload,
  countByOption,
  draftReducer,
  getDirtyStudentIds,
  getEntry,
  getUniformOption,
  initialDraftState,
} from '../draft';
import { filterStudents, sortStudents } from '../students';

interface Loaded {
  form: FormRow;
  session: FormSessionRow;
  students: StudentRow[];
  klass: ClassRow | null;
}

type Params = { classId: string; formId: string; sessionId: string };

/** Bir kaydı doldurma ekranı (referans: Ödev kontrolü). */
export function SessionFillScreen() {
  const { classId, formId, sessionId } = useLocalSearchParams<Params>();
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();

  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, dispatch] = useReducer(draftReducer, initialDraftState);
  const [saving, setSaving] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [noteStudentId, setNoteStudentId] = useState<string | null>(null);

  // --- Yükleme ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    Promise.all([getForm(formId), getSession(sessionId), listStudents(classId), listEntries(sessionId), getClass(classId)])
      .then(([form, session, students, entries, klass]) => {
        if (cancelled) return;
        setData({ form, session, students: sortStudents(students), klass });
        dispatch({ type: 'load', entries });
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(toUserMessage(error, 'Kayıt yüklenemedi. Tekrar deneyin.'));
      });
    return () => {
      cancelled = true;
    };
  }, [classId, formId, sessionId, reloadKey]);

  // --- Türetilmiş durum ------------------------------------------------------
  const options = useMemo(() => data?.form.options ?? [], [data]);
  const students = useMemo(() => data?.students ?? [], [data]);
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const visibleStudents = useMemo(() => filterStudents(students, query), [students, query]);
  const dirtyIds = useMemo(() => new Set(getDirtyStudentIds(state)), [state]);
  const dirtyCount = dirtyIds.size;
  const summary = useMemo(() => countByOption(state, studentIds, options), [state, studentIds, options]);
  const uniformOption = useMemo(() => getUniformOption(state, studentIds), [state, studentIds]);
  const classLabel = data?.klass?.name ?? null;

  // --- Kaydedilmemiş değişiklik koruması ------------------------------------
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
      Alert.alert(
        'Değişiklikler kaydedilmedi',
        `Çıkarsanız ${n} öğrencideki değişiklik kaybolur.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Kaydetmeden çık',
            style: 'destructive',
            onPress: () => navigation.dispatch(event.data.action),
          },
        ],
      );
    });
    return unsubscribe;
  }, [navigation]);

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
    return `${count} öğrenci ${label} olarak işaretlendi`;
  }, [state.undo, options]);

  const save = useCallback(async (): Promise<boolean> => {
    const payload = buildUpsertPayload(state, sessionId);
    if (payload.length === 0) return true;
    setSaving(true);
    try {
      await upsertEntries(payload);
      dispatch({ type: 'saved', entries: payload });
      return true;
    } catch (error) {
      toast.show(toUserMessage(error, 'Değişiklikler kaydedilemedi. Tekrar kaydedin.'), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [state, sessionId, toast]);

  const onSave = async () => {
    if (await save()) toast.show('Kaydedildi');
  };

  const onToggleStatus = async () => {
    if (!data) return;
    const next = data.session.status === 'published' ? 'draft' : 'published';
    setStatusBusy(true);
    try {
      // Yayınlanan kayıt, ekrandaki son hâli içersin.
      if (next === 'published' && !(await save())) return;
      const session = await updateSessionStatus(sessionId, next);
      setData((d) => (d ? { ...d, session } : d));
      toast.show(next === 'published' ? 'Yayınlandı' : 'Taslağa alındı');
    } catch (error) {
      toast.show(toUserMessage(error, 'Durum değiştirilemedi. Tekrar deneyin.'), 'error');
    } finally {
      setStatusBusy(false);
    }
  };

  const confirmDelete = () => {
    if (!data) return;
    Alert.alert(
      'Bu kayıt silinsin mi?',
      `${formatSessionDate(data.session.session_date)} kaydındaki tüm öğrenci girişleri de silinir. Bu işlem geri alınamaz.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaydı sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSession(sessionId);
              allowLeaveRef.current = true;
              toast.show('Kayıt silindi');
              router.back();
            } catch (error) {
              toast.show(toUserMessage(error, 'Kayıt silinemedi. Tekrar deneyin.'), 'error');
            }
          },
        },
      ],
    );
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
  };

  const noteStudent = noteStudentId ? students.find((s) => s.id === noteStudentId) : undefined;

  const renderItem = useCallback<ListRenderItem<StudentRow>>(
    ({ item }) => (
      <StudentEntryRow
        student={item}
        classLabel={classLabel}
        entry={getEntry(state.draft, item.id)}
        options={options}
        dirty={dirtyIds.has(item.id)}
        disabled={saving}
        onToggle={onToggle}
        onOpenNote={onOpenNote}
      />
    ),
    [classLabel, state.draft, options, dirtyIds, saving, onToggle, onOpenNote],
  );

  // --- Durumlar --------------------------------------------------------------
  if (loadError) {
    return (
      <Screen title="Kayıt">
        <View style={styles.stateWrap}>
          <Banner kind="error" message={loadError} />
          <Button label="Tekrar dene" variant="secondary" onPress={() => {
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }} />
        </View>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Kayıt" scroll={false}>
        <LoadingState label="Öğrenciler yükleniyor" />
      </Screen>
    );
  }

  const { form, session } = data;
  const published = session.status === 'published';

  const listHeader = (
    <View style={styles.listHeader}>
      <FormHeaderCard
        subject={form.subject}
        description={form.description}
        fallbackTitle={form.title}
        status={session.status}
      >
        <View style={styles.sessionMeta}>
          <View style={styles.sessionTexts}>
            <Text variant="label">{formatSessionDate(session.session_date)}</Text>
            {session.title ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {session.title}
              </Text>
            ) : null}
          </View>
          <Button
            label={published ? 'Taslağa al' : 'Yayınla'}
            variant="secondary"
            size="sm"
            fullWidth={false}
            loading={statusBusy}
            disabled={saving}
            onPress={onToggleStatus}
          />
        </View>
      </FormHeaderCard>

      {searchOpen ? (
        <View style={styles.search}>
          <TextField
            label="Öğrenci ara"
            value={query}
            onChangeText={setQuery}
            placeholder="Ad ya da okul numarası"
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            containerStyle={styles.searchField}
          />
          <IconButton icon="close" accessibilityLabel="Aramayı kapat" onPress={closeSearch} />
        </View>
      ) : null}

      {options.length === 0 ? (
        <View style={styles.stateWrap}>
          <Banner
            kind="warning"
            message="Bu formda seçenek yok. Formu düzenleyip en az bir seçenek ekleyin."
          />
          <Button
            label="Formu düzenle"
            variant="secondary"
            onPress={() => router.push(`/class/${classId}/form/${formId}/edit`)}
          />
        </View>
      ) : students.length > 0 && !query ? (
        <BulkApplyCard
          options={options}
          studentCount={students.length}
          uniformOption={uniformOption}
          onApply={onBulkApply}
          disabled={saving}
        />
      ) : null}
    </View>
  );

  const listEmpty =
    students.length === 0 ? (
      <View style={styles.padded}>
        <EmptyState
          icon="people"
          title="Bu sınıfta öğrenci yok"
          description="Öğrenci eklediğinizde her biri için seçenekleri buradan işaretlersiniz. Listeyi fotoğraftan ya da elle ekleyin."
          actionLabel="Öğrenci ekle"
          onAction={() => router.push(`/class/${classId}/import`)}
        />
      </View>
    ) : (
      <View style={styles.padded}>
        <Text variant="body" tone="muted">
          “{query.trim()}” ile eşleşen öğrenci yok. Adı ya da okul numarasını kontrol edin.
        </Text>
      </View>
    );

  return (
    <Screen
      title={form.title}
      scroll={false}
      padded={false}
      headerRight={
        <>
          <IconButton
            icon="search"
            accessibilityLabel={searchOpen ? 'Aramayı kapat' : 'Öğrenci ara'}
            onPress={searchOpen ? closeSearch : () => setSearchOpen(true)}
            color={searchOpen ? colors.primary : colors.text}
          />
          <IconButton icon="trash" accessibilityLabel="Kaydı sil" onPress={confirmDelete} />
        </>
      }
      footer={
        options.length > 0 && students.length > 0 ? (
          <>
            <OptionSummary options={options} counts={summary.counts} empty={summary.empty} />
            <Button
              label={dirtyCount > 0 ? `${dirtyCount} değişikliği kaydet` : 'Kaydet'}
              onPress={onSave}
              loading={saving}
              disabled={dirtyCount === 0 || statusBusy}
              accessibilityHint={dirtyCount === 0 ? 'Kaydedilmemiş değişiklik yok' : undefined}
              testID="save-button"
            />
          </>
        ) : undefined
      }
    >
      <FlatList
        data={visibleStudents as StudentRow[]}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={options.length > 0 ? listEmpty : null}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        contentContainerStyle={styles.listContent}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    paddingHorizontal: layout.pageX,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sessionTexts: { flex: 1, gap: spacing.xxs },
  search: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  searchField: { flex: 1 },
  stateWrap: { gap: spacing.md, paddingTop: spacing.sm },
  padded: { paddingHorizontal: layout.pageX, paddingVertical: spacing.lg },
  listContent: { paddingBottom: spacing.huge + spacing.xxxl },
});
