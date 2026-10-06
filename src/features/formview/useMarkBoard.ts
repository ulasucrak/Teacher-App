import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';

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
import type { FormRow } from '@/types/database';

import { bumpTally } from './board';

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

/** Birikimli formun işaretleme durumu: yükleme, iyimser işaretleme ve geri alma. */
export function useMarkBoard(form: Pick<FormRow, 'id' | 'options'>): MarkBoard {
  const toast = useToast();
  const [rows, setRows] = useState<StudentTally[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => todayIso());
  const [lastMark, setLastMark] = useState<LastMark | null>(null);
  const [undoingIds, setUndoingIds] = useState<ReadonlySet<string>>(new Set());
  const requestRef = useRef(0);
  const rowsRef = useRef<StudentTally[] | null>(null);
  const lastRef = useRef<LastMark | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const apply = useCallback((update: (rows: StudentTally[]) => StudentTally[]) => {
    setRows((current) => {
      const next = current ? update(current) : current;
      rowsRef.current = next;
      return next;
    });
  }, []);

  const setLast = useCallback((value: LastMark | null) => {
    lastRef.current = value;
    setLastMark(value);
  }, []);

  const formId = form.id;
  const options = form.options;

  const reload = useCallback(() => {
    const request = ++requestRef.current;
    const day = todayIso();
    setToday(day);
    setLoadError(null);
    getTallies(formId, { day })
      .then((tallies) => {
        if (request !== requestRef.current || !aliveRef.current) return;
        const order = sortStudents(tallies.map((t, index) => ({ index, number: t.number, full_name: t.fullName })));
        const next = order.map(({ index }) => tallies[index] as StudentTally);
        rowsRef.current = next;
        setRows(next);
      })
      .catch((error: unknown) => {
        if (request === requestRef.current && aliveRef.current) setLoadError(historyErrorMessage(error, 'counts'));
      });
  }, [formId]);

  const mark = useCallback(
    (studentId: string, optionKey: string) => {
      const student = rowsRef.current?.find((r) => r.studentId === studentId);
      if (!student) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      apply((current) => bumpTally(current, studentId, optionKey, 1));
      addMark({ formId, studentId, optionKey, markDate: todayIso() }).then(
        (saved) => {
          if (!aliveRef.current) return;
          setLast({
            markId: saved.id,
            studentId,
            optionKey,
            message: `${student.fullName}: ${optionLabel(optionKey, options)} eklendi`,
          });
        },
        (error: unknown) => {
          if (!aliveRef.current) return;
          apply((current) => bumpTally(current, studentId, optionKey, -1));
          toast.show(historyErrorMessage(error, 'mark'), 'error');
        },
      );
    },
    [apply, formId, options, setLast, toast],
  );

  const undoStudent = useCallback(
    async (studentId: string) => {
      setUndoingIds((ids) => new Set(ids).add(studentId));
      try {
        const removed = await undoLastMark({ formId, studentId, markDate: todayIso() });
        if (!aliveRef.current) return;
        if (removed) {
          apply((current) => bumpTally(current, studentId, removed.option_key, -1));
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
    [apply, formId, options, reload, setLast, toast],
  );

  const undoLast = useCallback(async () => {
    const last = lastRef.current;
    if (!last) return;
    setLast(null);
    apply((current) => bumpTally(current, last.studentId, last.optionKey, -1));
    try {
      const removed = await removeMark(last.markId);
      // İşaret çoktan silinmişse (satırdaki geri alma) sayı iki kez düşmesin.
      if (!removed && aliveRef.current) apply((current) => bumpTally(current, last.studentId, last.optionKey, 1));
    } catch (error) {
      if (!aliveRef.current) return;
      apply((current) => bumpTally(current, last.studentId, last.optionKey, 1));
      toast.show(historyErrorMessage(error, 'undo'), 'error');
    }
  }, [apply, setLast, toast]);

  const dismissLast = useCallback(() => setLast(null), [setLast]);

  return { rows, loadError, today, reload, mark, undoStudent, lastMark, undoLast, dismissLast, undoingIds };
}
