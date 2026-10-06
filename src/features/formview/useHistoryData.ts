import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getFormSummary,
  historyErrorMessage,
  listHistory,
  type DateRange,
  type FormSummary,
  type HistoryCursor,
  type HistoryEvent,
} from '@/features/history';
import type { FormRow } from '@/types/database';

export type HistoryView = 'summary' | 'timeline';

interface Keyed<T> {
  key: string;
  value: T;
}

export interface Timeline {
  events: HistoryEvent[];
  nextCursor: HistoryCursor | null;
}

export interface HistoryData {
  summary: FormSummary | null;
  summaryError: string | null;
  timeline: Timeline | null;
  timelineError: string | null;
  loadingMore: boolean;
  loadMoreError: string | null;
  loadMore: () => void;
  retry: () => void;
}

interface Options {
  /** Sekme görünürken yükler; her görünür olduğunda tazeler (işaretleme sonrası). */
  active: boolean;
  view: HistoryView;
  range: DateRange;
  studentId: string | null;
}

/**
 * Geçmiş sekmesinin verisi: özet (öğrenci başına sayılar) ve sayfalı zaman çizelgesi.
 * Dönem ya da öğrenci değişince ilgili veri yeniden istenir; sekme yeniden açılınca eski veri
 * görünürken sessizce tazelenir.
 */
export function useHistoryData(form: Pick<FormRow, 'id' | 'options'>, { active, view, range, studentId }: Options): HistoryData {
  const summaryKey = `${range.from ?? ''}|${range.to ?? ''}`;
  const timelineKey = `${summaryKey}|${studentId ?? ''}`;

  const [summaryState, setSummaryState] = useState<Keyed<FormSummary> | null>(null);
  const [summaryFailure, setSummaryFailure] = useState<Keyed<string> | null>(null);
  const [timelineState, setTimelineState] = useState<Keyed<Timeline> | null>(null);
  const [timelineFailure, setTimelineFailure] = useState<Keyed<string> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const summaryRequest = useRef(0);
  const timelineRequest = useRef(0);
  const timelineRef = useRef<Keyed<Timeline> | null>(null);

  const formId = form.id;
  const options = form.options;

  useEffect(() => {
    if (!active || view !== 'summary') return;
    const request = ++summaryRequest.current;
    getFormSummary({ id: formId, options }, range).then(
      (value) => {
        if (request !== summaryRequest.current) return;
        setSummaryState({ key: summaryKey, value });
        setSummaryFailure(null);
      },
      (error: unknown) => {
        if (request === summaryRequest.current) {
          setSummaryFailure({ key: summaryKey, value: historyErrorMessage(error, 'summary') });
        }
      },
    );
    // `range` içeriği summaryKey'de.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, view, formId, options, summaryKey, attempt]);

  useEffect(() => {
    if (!active || view !== 'timeline') return;
    const request = ++timelineRequest.current;
    listHistory(formId, { range, studentId }).then(
      (page) => {
        if (request !== timelineRequest.current) return;
        const next = { key: timelineKey, value: { events: page.events, nextCursor: page.nextCursor } };
        timelineRef.current = next;
        setTimelineState(next);
        setTimelineFailure(null);
        setLoadMoreError(null);
      },
      (error: unknown) => {
        if (request === timelineRequest.current) {
          setTimelineFailure({ key: timelineKey, value: historyErrorMessage(error, 'history') });
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, view, formId, timelineKey, attempt]);

  const loadMore = useCallback(() => {
    const current = timelineRef.current;
    if (!current || current.key !== timelineKey || !current.value.nextCursor || loadingMore) return;
    const request = timelineRequest.current;
    setLoadingMore(true);
    setLoadMoreError(null);
    listHistory(formId, { range, studentId, cursor: current.value.nextCursor }).then(
      (page) => {
        setLoadingMore(false);
        if (request !== timelineRequest.current) return;
        const next = {
          key: timelineKey,
          value: { events: [...current.value.events, ...page.events], nextCursor: page.nextCursor },
        };
        timelineRef.current = next;
        setTimelineState(next);
      },
      (error: unknown) => {
        setLoadingMore(false);
        if (request === timelineRequest.current) setLoadMoreError(historyErrorMessage(error, 'history'));
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, timelineKey, loadingMore]);

  // Yalnızca geçerli dönem/öğrenciye ait veri gösterilir; eskisi yüklenirken boş görünür.
  return {
    summary: summaryState?.key === summaryKey ? summaryState.value : null,
    summaryError: summaryFailure?.key === summaryKey ? summaryFailure.value : null,
    timeline: timelineState?.key === timelineKey ? timelineState.value : null,
    timelineError: timelineFailure?.key === timelineKey ? timelineFailure.value : null,
    loadingMore,
    loadMoreError,
    loadMore,
    retry: () => setAttempt((n) => n + 1),
  };
}
