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
import { useRealtimeRefresh } from '@/lib/realtime';
import type { FormRow } from '@/types/database';

/** Geçmiş görünümleri: özet, günlük inceleme (`day`) ve zaman çizelgesi (`list`). */
export type HistoryView = 'summary' | 'day' | 'list';

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

/**
 * Canlı yenilemede gelen ilk sayfayı yüklü zaman çizelgesiyle birleştirir: yeni olaylar başa
 * eklenir, `loadMore` ile yüklenmiş sayfalar ve devam imleci korunur. İlk sayfa yüklü olaylarla
 * hiç örtüşmüyorsa (arada boşluk olabilir) liste ilk sayfayla değiştirilir (`replaced`).
 */
export function mergeTimeline(current: Timeline, page: Timeline): { timeline: Timeline; replaced: boolean } {
  if (current.events.length === 0) return { timeline: page, replaced: true };
  const ids = new Set(current.events.map((e) => e.id));
  if (!page.events.some((e) => ids.has(e.id))) return { timeline: page, replaced: true };
  const fresh = page.events.filter((e) => !ids.has(e.id));
  if (fresh.length === 0) return { timeline: current, replaced: false };
  return { timeline: { events: [...fresh, ...current.events], nextCursor: current.nextCursor }, replaced: false };
}

/** Sonraki sayfayı ekler; canlı yenilemeyle zaten gelmiş olaylar tekrarlanmaz. */
export function appendPage(current: Timeline, page: Timeline): Timeline {
  const ids = new Set(current.events.map((e) => e.id));
  return { events: [...current.events, ...page.events.filter((e) => !ids.has(e.id))], nextCursor: page.nextCursor };
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

  /**
   * Canlı yenileme (başka cihazdaki işaret/kayıt, ön plana dönüş): ekrandaki veri yerinde tazelenir.
   * Sessizdir: hata gösterilmez, ekrandaki veri kalır. Zaman çizelgesinde yüklenen sayfalar korunur.
   */
  const liveRefresh = () => {
    if (view === 'summary') {
      const request = summaryRequest.current;
      const key = summaryKey;
      getFormSummary({ id: formId, options }, range).then(
        (value) => {
          if (request !== summaryRequest.current) return;
          setSummaryState({ key, value });
          setSummaryFailure(null);
        },
        () => undefined,
      );
      return;
    }
    if (view !== 'list') return;
    const loaded = timelineRef.current;
    // İlk yükleme sürüyorsa o zaten güncel veriyi getirecek.
    if (!loaded || loaded.key !== timelineKey) return;
    const request = timelineRequest.current;
    const key = timelineKey;
    listHistory(formId, { range, studentId }).then(
      (page) => {
        const latest = timelineRef.current;
        if (request !== timelineRequest.current || !latest || latest.key !== key) return;
        const { timeline, replaced } = mergeTimeline(latest.value, { events: page.events, nextCursor: page.nextCursor });
        if (timeline === latest.value) return;
        // Liste değiştiyse süren "daha fazla" isteği eski imlece ait: sonucu yok sayılsın.
        if (replaced) {
          timelineRequest.current += 1;
          setLoadingMore(false);
          setLoadMoreError(null);
        }
        const next = { key, value: timeline };
        timelineRef.current = next;
        setTimelineState(next);
        setTimelineFailure(null);
      },
      () => undefined,
    );
  };

  useRealtimeRefresh({
    name: 'history',
    tables: [{ table: 'form_events', event: 'INSERT', filter: `form_id=eq.${formId}` }],
    enabled: active && view !== 'day',
    onChange: liveRefresh,
  });

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
    if (!active || view !== 'list') return;
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
        const latest = timelineRef.current;
        if (request !== timelineRequest.current || !latest || latest.key !== timelineKey) return;
        // Bu arada canlı yenileme başa olay eklemiş olabilir: en son listeye eklenir.
        const next = { key: timelineKey, value: appendPage(latest.value, page) };
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
