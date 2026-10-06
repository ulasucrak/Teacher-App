import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/components/ui';
import { useRealtimeRefresh, type RealtimeTableSpec } from '@/lib/realtime';
import type { FormEntryRow, FormRow, FormSessionRow, StudentRow } from '@/types/database';

import {
  deleteSession,
  ensureSessionForDate,
  findSessionByDate,
  getForm,
  getSession,
  listEntries,
  listStudents,
  SessionNotFoundError,
  toUserMessage,
  updateSessionStatus,
  upsertEntries,
} from '../api';
import { isIsoDate, todayIso } from '../date';
import {
  buildUpsertPayload,
  countByOption,
  draftReducer,
  getDirtyStudentIds,
  getUniformOption,
  initialDraftState,
} from '../draft';
import { NEW_SESSION_ID } from '../routes';
import { filterStudents, sortStudents } from '../students';

export interface SessionFillData {
  form: FormRow;
  /** null → bu gün için henüz kayıt yok; ilk "Kaydet"te oluşturulur. */
  session: FormSessionRow | null;
  date: string;
  students: StudentRow[];
}

export interface UseSessionFillArgs {
  classId: string;
  formId: string;
  /** Var olan kaydın kimliği ya da `NEW_SESSION_ID` (gün için kayıt yoksa ilk kaydetmede oluşur). */
  sessionId: string;
  /** `NEW_SESSION_ID` ile açılırken doldurulacak gün (varsayılan bugün). */
  date?: string;
  /** Form zaten yüklüyse yeniden istenmez. */
  form?: FormRow;
}

async function loadScreen(args: UseSessionFillArgs) {
  const { formId, sessionId, classId, date: dateParam, form: preloaded } = args;
  const loadForm = () => (preloaded ? Promise.resolve(preloaded) : getForm(formId));
  if (sessionId === NEW_SESSION_ID) {
    const date = dateParam && isIsoDate(dateParam) ? dateParam : todayIso();
    const [form, session, students] = await Promise.all([loadForm(), findSessionByDate(formId, date), listStudents(classId)]);
    const entries: FormEntryRow[] = session ? await listEntries(session.id) : [];
    return { form, session, date, students, entries };
  }
  const [form, session, students, entries] = await Promise.all([
    loadForm(),
    getSession(sessionId),
    listStudents(classId),
    listEntries(sessionId),
  ]);
  return { form, session, date: session.session_date, students, entries };
}

/**
 * Bir günün kaydını doldurma mantığı: yükleme, taslak, toplu uygulama, geri alma, kaydetme
 * (ilk kaydetmede kayıt oluşturma), kaydedilmemiş değişiklik koruması. Hem tek başına kayıt
 * ekranı (`SessionFillScreen`) hem de form ekranının "İşaretle" sekmesi bunu kullanır.
 */
export function useSessionFill(args: UseSessionFillArgs) {
  const { classId, formId, sessionId, date: dateParam, form: preloaded } = args;
  const navigation = useNavigation();
  const toast = useToast();

  const [data, setData] = useState<SessionFillData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, dispatch] = useReducer(draftReducer, initialDraftState);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [noteStudentId, setNoteStudentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Kaydedilmemiş değişikliği olan öğrenci sayısı (aşağıda güncellenir). */
  const dirtyRef = useRef(0);
  const savingRef = useRef(false);
  /** Sıradaki yükleme canlı eşitlemeden: hata göstermez, taslak varsa uygulanmaz. */
  const silentRef = useRef(false);
  /** Taslak/kaydetme sürerken gelen uzak değişiklik: kaydedilince (ya da taslak boşalınca) yüklenir. */
  const pendingRef = useRef(false);

  // --- Yükleme ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const silent = silentRef.current;
    silentRef.current = false;
    loadScreen({ classId, formId, sessionId, date: dateParam, form: preloaded })
      .then(({ form, session, date, students, entries }) => {
        if (cancelled) return;
        if (silent && (dirtyRef.current > 0 || savingRef.current)) {
          // Yükleme sürerken kullanıcı değişiklik yaptı: taslağı ezme, kaydedince tekrar yükle.
          pendingRef.current = true;
          return;
        }
        if (session && session.form_id !== formId) {
          setLoadError('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.');
          return;
        }
        setData({ form, session, date, students: sortStudents(students) });
        dispatch({ type: 'load', entries });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Arka plan yenilemesi başarısızsa ekrandaki veri kalır (ön plana dönüşte yeniden denenir);
        // ama kayıt başka cihazda silindiyse kullanıcı silinmiş kaydı düzenlemeye devam etmesin.
        if (silent && !(error instanceof SessionNotFoundError)) return;
        setLoadError(toUserMessage(error, 'Kayıt yüklenemedi. Tekrar deneyin.'));
      });
    return () => {
      cancelled = true;
    };
  }, [classId, formId, sessionId, dateParam, preloaded, reloadKey]);

  const retry = useCallback(() => {
    setLoadError(null);
    setReloadKey((k) => k + 1);
  }, []);

  // --- Türetilmiş durum ------------------------------------------------------
  const options = useMemo(() => data?.form.options ?? [], [data]);
  const students = useMemo(() => data?.students ?? [], [data]);
  const studentIds = useMemo(() => students.map((s) => s.id), [students]);
  const visibleStudents = useMemo(() => filterStudents(students, query), [students, query]);
  const dirtyIds = useMemo(() => new Set(getDirtyStudentIds(state)), [state]);
  const dirtyCount = dirtyIds.size;
  const summary = useMemo(() => countByOption(state, studentIds, options), [state, studentIds, options]);
  const uniformOption = useMemo(() => getUniformOption(state, studentIds), [state, studentIds]);

  // --- Canlı eşitleme -------------------------------------------------------
  // Başka cihazdaki kayıt değişiklikleri (form_events) ve sınıf listesi (students). Taslak varken
  // ekran yenilenmez; değişiklikler kaydedilince ya da taslak boşalınca yüklenir.
  const sessionRef = useRef<FormSessionRow | null>(null);
  useEffect(() => {
    sessionRef.current = data?.session ?? null;
  }, [data]);

  /**
   * Taslak varken yalnızca kaydın hâlâ var olduğunu denetler. Başka cihazda silindiyse: açık kayıt
   * ekranında hata gösterilir; gün görünümünde kayıt "yok" sayılır (ilk kaydetmede yeniden oluşur,
   * taslak korunur).
   */
  const checkSessionStillExists = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return;
    if (sessionId !== NEW_SESSION_ID) {
      getSession(sessionId).catch((error: unknown) => {
        if (error instanceof SessionNotFoundError) setLoadError(error.message);
      });
      return;
    }
    findSessionByDate(formId, current.session_date).then(
      (found) => {
        if (found?.id === current.id) return;
        setData((d) => (d && d.session?.id === current.id ? { ...d, session: found } : d));
      },
      () => undefined,
    );
  }, [formId, sessionId]);

  const silentReload = useCallback(() => {
    if (dirtyRef.current > 0 || savingRef.current) {
      pendingRef.current = true;
      if (!savingRef.current) checkSessionStillExists();
      return;
    }
    pendingRef.current = false;
    silentRef.current = true;
    setReloadKey((k) => k + 1);
  }, [checkSessionStillExists]);

  const liveTables = useMemo<RealtimeTableSpec[]>(
    () => [
      { table: 'form_events', event: 'INSERT', filter: `form_id=eq.${formId}` },
      { table: 'students', filter: `class_id=eq.${classId}` },
    ],
    [formId, classId],
  );
  useRealtimeRefresh({ name: 'session', tables: liveTables, enabled: data !== null, onChange: silentReload });

  useEffect(() => {
    savingRef.current = saving;
    dirtyRef.current = dirtyCount;
    if (!saving && dirtyCount === 0 && pendingRef.current) silentReload();
  }, [saving, dirtyCount, silentReload]);

  // --- Kaydedilmemiş değişiklik koruması (sistem Alert'i yalnızca burada) ----
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

  /**
   * Gün değiştirmeden önce çağırın: değişiklik varsa sorar, "Kaydetmeden geç" denirse `proceed`
   * çalışır; yoksa doğrudan çalışır.
   */
  const confirmDiscard = useCallback((proceed: () => void) => {
    const n = dirtyRef.current;
    if (n === 0) {
      proceed();
      return;
    }
    Alert.alert('Değişiklikler kaydedilmedi', `Devam ederseniz ${n} öğrencideki değişiklik kaybolur.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaydetmeden geç', style: 'destructive', onPress: proceed },
    ]);
  }, []);

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

  const onSave = useCallback(async () => {
    if (!data || saving) return;
    savingRef.current = true;
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
  }, [data, saving, formId, state, toast]);

  /**
   * Kaydı siler; başarılıysa `onDeleted` çalışır. `leaving`: ekran kapanacak (kaydedilmemiş
   * değişiklik koruması devre dışı kalır); aksi hâlde ekran açık kalır, gün yeniden yüklenebilir.
   */
  const deleteCurrent = useCallback(
    async (onDeleted: () => void, leaving = false) => {
      const session = data?.session;
      if (!session) return;
      setDeleting(true);
      try {
        await deleteSession(session.id);
        if (leaving) allowLeaveRef.current = true;
        toast.show('Kayıt silindi');
        onDeleted();
      } catch (error) {
        toast.show(toUserMessage(error, 'Kayıt silinemedi. Tekrar deneyin.'), 'error');
      } finally {
        setDeleting(false);
      }
    },
    [data, toast],
  );

  return {
    data,
    loadError,
    retry,
    options,
    students,
    visibleStudents,
    dirtyIds,
    dirtyCount,
    summary,
    uniformOption,
    draft: state.draft,
    query,
    setQuery,
    saving,
    deleting,
    noteStudentId,
    setNoteStudentId,
    onToggle,
    onOpenNote,
    onBulkApply,
    onUndo,
    onDismissUndo,
    undoMessage,
    onSave,
    deleteCurrent,
    confirmDiscard,
    dispatch,
  };
}

export type SessionFill = ReturnType<typeof useSessionFill>;
