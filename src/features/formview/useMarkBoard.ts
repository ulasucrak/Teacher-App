import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components/ui';
import {
  addMark,
  getTallies,
  historyErrorMessage,
  optionLabel,
  removeMark,
  undoLastMark,
  type StudentTally,
} from '@/features/history';
import { sortStudents } from '@/features/sessions/students';
import { todayIso } from '@/features/sessions/date';
import { useRealtimeRefresh, type RealtimePayload, type RealtimeTableSpec } from '@/lib/realtime';
import type { FormRow } from '@/types/database';

import { applyOps, msUntilNextDay, reconcileOps, type PendingOp } from './board';

export interface LastMark {
  markId: string;
  studentId: string;
  optionKey: string;
  message: string;
}

export interface MarkBoard {
  /** Sayıları yüklenmiş öğrenciler (okul numarası, sonra ada göre). */
  rows: StudentTally[] | null;
  loadError: string | null;
  /** Bugün (cihaz takvimi); işaretler bu güne yazılır. */
  today: string;
  reload: () => void;
  /** Tek dokunuş = bir işaret. Sayı hemen artar; sunucu reddederse geri alınır. */
  mark: (studentId: string, optionKey: string) => void;
  /** Öğrencinin bugünkü son işaretini geri alır. */
  undoStudent: (studentId: string) => Promise<void>;
  /** Geri alma bandı: en son eklenen işaret. */
  lastMark: LastMark | null;
  /** Bandın "Geri al"ı: o işareti siler (sayı hemen azalır; hata olursa geri gelir). */
  undoLast: () => Promise<void>;
  dismissLast: () => void;
  /** Geri alınmakta olan öğrenciler. */
  undoingIds: ReadonlySet<string>;
}

/** Dokunuş titreşimi; webde yoktur (expo-haptics webde hata verebilir). */
function tapFeedback(): void {
  if (Platform.OS === 'web') return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  } catch {
    // Titreşim desteklenmiyorsa sessizce geç.
  }
}

/** Olay bu cihazın yazdığı bir işaretin yankısı mı (`form_events.mark_id`). */
function markIdOf(payload: RealtimePayload): string | null {
  const row = payload.new as Record<string, unknown> | undefined;
  const id = row?.mark_id;
  return typeof id === 'string' ? id : null;
}

/**
 * Birikimli formun işaretleme durumu: yükleme, iyimser işaretleme ve geri alma.
 *
 * Görünen sayılar = son sunucu görüntüsü + henüz görüntüye girmemiş yerel işlemler
 * (`PendingOp`). Yeniden yükleme (canlı eşitleme, ön plana dönüş, gün değişimi) yerel işlemleri
 * ezmez; başarısız bir işlem yalnızca listeden çıkar, sayıyı iki kez düşürmez. Başka cihazdaki
 * işaretler `form_events` üzerinden canlı gelir; bu cihazın kendi işaretlerinin yankısı yok sayılır.
 */
export function useMarkBoard(form: Pick<FormRow, 'id' | 'options'> & Partial<Pick<FormRow, 'class_id'>>): MarkBoard {
  const toast = useToast();
  const [serverRows, setServerRows] = useState<StudentTally[] | null>(null);
  const [ops, setOpsState] = useState<readonly PendingOp[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => todayIso());
  const [lastMark, setLastMark] = useState<LastMark | null>(null);
  const [undoingIds, setUndoingIds] = useState<ReadonlySet<string>>(new Set());
  const requestRef = useRef(0);
  const serverRef = useRef<StudentTally[] | null>(null);
  const opsRef = useRef<readonly PendingOp[]>([]);
  const clockRef = useRef(0);
  const opKeyRef = useRef(0);
  const resyncRef = useRef(false);
  const todayRef = useRef(today);
  const ownMarkIds = useRef(new Set<string>());
  const lastRef = useRef<LastMark | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const rows = useMemo(() => (serverRows ? applyOps(serverRows, ops) : null), [serverRows, ops]);

  const setOps = useCallback((next: readonly PendingOp[]) => {
    opsRef.current = next;
    setOpsState(next);
  }, []);

  const setLast = useCallback((value: LastMark | null) => {
    lastRef.current = value;
    setLastMark(value);
  }, []);

  const formId = form.id;
  const classId = form.class_id;
  const options = form.options;

  const reloadRef = useRef<() => void>(() => undefined);

  /** Belirsiz bir görüntüden sonra tüm işlemler bitince bir kez daha yükle (kesin sayı için). */
  const resyncIfSettled = useCallback(() => {
    if (!resyncRef.current || !aliveRef.current) return;
    if (opsRef.current.some((op) => op.settledAt === null)) return;
    resyncRef.current = false;
    reloadRef.current();
  }, []);

  const reload = useCallback(() => {
    const request = ++requestRef.current;
    const startedAt = ++clockRef.current;
    const day = todayIso();
    todayRef.current = day;
    setToday(day);
    setLoadError(null);
    getTallies(formId, { day })
      .then((tallies) => {
        if (request !== requestRef.current || !aliveRef.current) return;
        const order = sortStudents(tallies.map((t, index) => ({ index, number: t.number, full_name: t.fullName })));
        const next = order.map(({ index }) => tallies[index] as StudentTally);
        const { kept, ambiguous } = reconcileOps(opsRef.current, startedAt);
        serverRef.current = next;
        setServerRows(next);
        setOps(kept);
        if (ambiguous) resyncRef.current = true;
        resyncIfSettled();
      })
      .catch((error: unknown) => {
        if (request === requestRef.current && aliveRef.current) setLoadError(historyErrorMessage(error, 'counts'));
      });
  }, [formId, resyncIfSettled, setOps]);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  const addOp = useCallback(
    (studentId: string, optionKey: string, delta: 1 | -1, settled: boolean): number => {
      const key = ++opKeyRef.current;
      const at = ++clockRef.current;
      setOps([...opsRef.current, { key, studentId, optionKey, delta, issuedAt: at, settledAt: settled ? at : null }]);
      return key;
    },
    [setOps],
  );

  /** İşlem sunucuda tamamlandı: görüntüye girene kadar sayıya eklenmeye devam eder. */
  const settleOp = useCallback(
    (key: number) => {
      const at = ++clockRef.current;
      setOps(opsRef.current.map((op) => (op.key === key ? { ...op, settledAt: at } : op)));
      resyncIfSettled();
    },
    [resyncIfSettled, setOps],
  );

  /** İşlem başarısız ya da etkisiz: sayıdan çıkar (görüntüye hiç girmedi). */
  const dropOp = useCallback(
    (key: number) => {
      setOps(opsRef.current.filter((op) => op.key !== key));
      resyncIfSettled();
    },
    [resyncIfSettled, setOps],
  );

  // Gece yarısı "bugün" değişir: bugünün sayıları için yeniden yükle.
  useEffect(() => {
    const timer = setTimeout(() => reloadRef.current(), msUntilNextDay());
    return () => clearTimeout(timer);
  }, [today]);

  // Canlı eşitleme: bu formun olayları (işaretler) ve sınıfın öğrenci listesi.
  const liveTables = useMemo<RealtimeTableSpec[]>(
    () => [
      { table: 'form_events', event: 'INSERT', filter: `form_id=eq.${formId}` },
      ...(classId ? [{ table: 'students' as const, filter: `class_id=eq.${classId}` }] : []),
    ],
    [formId, classId],
  );
  useRealtimeRefresh({
    name: 'marks',
    tables: liveTables,
    ignore: (payload) => {
      const markId = markIdOf(payload);
      return markId !== null && ownMarkIds.current.has(markId);
    },
    onChange: () => reloadRef.current(),
  });

  const mark = useCallback(
    (studentId: string, optionKey: string) => {
      const student = serverRef.current?.find((r) => r.studentId === studentId);
      if (!student) return;
      tapFeedback();
      const day = todayIso();
      const key = addOp(studentId, optionKey, 1, false);
      addMark({ formId, studentId, optionKey, markDate: day }).then(
        (saved) => {
          ownMarkIds.current.add(saved.id);
          if (!aliveRef.current) return;
          settleOp(key);
          setLast({
            markId: saved.id,
            studentId,
            optionKey,
            message: `${student.fullName}: ${optionLabel(optionKey, options)} eklendi`,
          });
        },
        (error: unknown) => {
          if (!aliveRef.current) return;
          dropOp(key);
          toast.show(historyErrorMessage(error, 'mark'), 'error');
        },
      );
      // Gün dönmüşse "bugün" sayıları eskidir: yeni günü yükle.
      if (day !== todayRef.current) reload();
    },
    [addOp, dropOp, formId, options, reload, setLast, settleOp, toast],
  );

  const undoStudent = useCallback(
    async (studentId: string) => {
      setUndoingIds((ids) => new Set(ids).add(studentId));
      try {
        const removed = await undoLastMark({ formId, studentId, markDate: todayIso() });
        if (removed) ownMarkIds.current.add(removed.id);
        if (!aliveRef.current) return;
        if (removed) {
          addOp(studentId, removed.option_key, -1, true);
          if (lastRef.current?.markId === removed.id) setLast(null);
          toast.show(`${optionLabel(removed.option_key, options)} geri alındı`);
        } else {
          toast.show('Bugün geri alınacak işaret yok');
          reload();
        }
      } catch (error) {
        if (aliveRef.current) toast.show(historyErrorMessage(error, 'undo'), 'error');
      } finally {
        if (aliveRef.current) {
          setUndoingIds((ids) => {
            const next = new Set(ids);
            next.delete(studentId);
            return next;
          });
        }
      }
    },
    [addOp, formId, options, reload, setLast, toast],
  );

  const undoLast = useCallback(async () => {
    const last = lastRef.current;
    if (!last) return;
    setLast(null);
    const key = addOp(last.studentId, last.optionKey, -1, false);
    try {
      const removed = await removeMark(last.markId);
      if (!aliveRef.current) return;
      // İşaret çoktan silinmişse (satırdaki geri alma) sayı iki kez düşmesin.
      if (removed) settleOp(key);
      else dropOp(key);
    } catch (error) {
      if (!aliveRef.current) return;
      dropOp(key);
      toast.show(historyErrorMessage(error, 'undo'), 'error');
    }
  }, [addOp, dropOp, setLast, settleOp, toast]);

  const dismissLast = useCallback(() => setLast(null), [setLast]);

  return { rows, loadError, today, reload, mark, undoStudent, lastMark, undoLast, dismissLast, undoingIds };
}
