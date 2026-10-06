import { useEffect, useRef, useState } from 'react';

import {
  MAX_HISTORY_PAGE_SIZE,
  getFormSummary,
  historyErrorMessage,
  listHistory,
  type FormSummary,
  type HistoryEvent,
} from '@/features/history';
import type { FormRow } from '@/types/database';

export interface DayChanges {
  /** O gün yapılan değişiklik sayısı (günlük formda kayıt değişiklikleri; ilk içe aktarım hariç). */
  total: number;
  /** Öğrenci kimliği → o öğrencinin o günkü değişiklik sayısı. */
  byStudent: Record<string, number>;
  /** Çok fazla olay var: sayı "en az" demektir. */
  capped: boolean;
}

export interface DayReview {
  day: string;
  summary: FormSummary;
  changes: DayChanges;
}

/** Günün olaylarından değişiklik sayılarını çıkarır (saf). */
export function countDayChanges(events: readonly HistoryEvent[], capped: boolean): DayChanges {
  const byStudent: Record<string, number> = {};
  let total = 0;
  for (const event of events) {
    if (event.kind !== 'entry_created' && event.kind !== 'entry_updated' && event.kind !== 'entry_deleted') continue;
    total += 1;
    byStudent[event.studentId] = (byStudent[event.studentId] ?? 0) + 1;
  }
  return { total, byStudent, capped };
}

interface Result {
  review: DayReview | null;
  error: string | null;
  retry: () => void;
}

/**
 * Gün incelemesi: seçilen günün öğrenci başına değerleri/sayıları (tek günlük özet) ve o gün
 * yapılan değişiklikler. Gün ya da sekme değişince yeniden istenir; eski gün verisi gösterilmez.
 */
export function useDayReview(form: Pick<FormRow, 'id' | 'options' | 'mode'>, day: string, enabled: boolean): Result {
  const [state, setState] = useState<DayReview | null>(null);
  const [failure, setFailure] = useState<{ day: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const request = useRef(0);
  const formId = form.id;
  const options = form.options;
  const daily = form.mode === 'daily';

  useEffect(() => {
    if (!enabled) return;
    const id = ++request.current;
    const range = { from: day, to: day };
    Promise.all([
      getFormSummary({ id: formId, options }, range),
      // Birikimli formda sayılar yeterli; değişiklik sayısı yalnızca günlük formda gösterilir.
      daily ? listHistory(formId, { range, limit: MAX_HISTORY_PAGE_SIZE }) : Promise.resolve(null),
    ]).then(
      ([summary, page]) => {
        if (id !== request.current) return;
        setState({
          day,
          summary,
          changes: countDayChanges(page?.events ?? [], page?.nextCursor != null),
        });
        setFailure(null);
      },
      (error: unknown) => {
        if (id === request.current) setFailure({ day, message: historyErrorMessage(error, 'summary') });
      },
    );
  }, [enabled, formId, options, daily, day, attempt]);

  return {
    review: state?.day === day ? state : null,
    error: failure?.day === day ? failure.message : null,
    retry: () => setAttempt((n) => n + 1),
  };
}
