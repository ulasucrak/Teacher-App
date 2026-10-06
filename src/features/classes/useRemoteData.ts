import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';

import {
  payloadRowId,
  useRealtimeRefresh,
  type RealtimePayload,
  type RealtimeTable,
  type RealtimeTableSpec,
} from '@/lib/realtime';

import { toUserMessage } from './errors';

export type RemoteStatus = 'loading' | 'ready' | 'error';

export interface RemoteData<T> {
  data: T | null;
  status: RemoteStatus;
  /** Kullanıcıya gösterilecek hata (ne oldu + nasıl düzelir). */
  error: string | null;
  /** Aşağı çekip yenileme sürüyor. */
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** Hata ekranındaki "Tekrar dene". */
  retry: () => Promise<void>;
  /** Değişiklik sonrası yerel güncelleme (yeniden istek atmadan). */
  setData: (update: SetStateAction<T | null>) => void;
}

type Mode = 'initial' | 'refresh' | 'silent';

export interface RemoteDataOptions {
  /**
   * Canlı eşitleme: bu tablolarda (başka cihazdan) değişiklik olunca ekran odaktayken sessizce
   * yeniden yükler. Varsayılan sınıf/öğrenci/form tabloları; `false` kapatır.
   */
  live?: readonly (RealtimeTable | RealtimeTableSpec)[] | false;
}

/**
 * Sınıf, öğrenci ve form ekranlarının (sayılar dâhil) bağlı olduğu tablolar. Ekleme/güncelleme
 * yalnızca öğretmenin kendi satırları için dinlenir (`teacher_id` süzgeci). DELETE süzülemez ve
 * herkesin silmesi (yalnızca kimlik) gelir: ekrandaki veride o kimlik yoksa yok sayılır.
 */
export const DEFAULT_LIVE_TABLES: readonly RealtimeTableSpec[] = (['classes', 'students', 'forms'] as const).flatMap(
  (table: RealtimeTable): RealtimeTableSpec[] => [
    { table, own: true },
    { table, event: 'DELETE' },
  ],
);

/** Verinin herhangi bir yerinde bu kimlik geçiyor mu (silinen satır ekranda mı). */
export function dataMentionsId(data: unknown, id: string): boolean {
  if (data == null) return false;
  try {
    return JSON.stringify(data).includes(`"${id}"`);
  } catch {
    return true;
  }
}

/** DELETE olayı ekrandaki veriyle ilgisizse true (yenileme gerekmez). */
export function isUnrelatedDelete(payload: RealtimePayload, data: unknown): boolean {
  if (payload.eventType !== 'DELETE') return false;
  const id = payloadRowId(payload);
  return id === null || !dataMentionsId(data, id);
}

/**
 * Ekran odaklandığında veriyi yükler (başka ekrandan dönüldüğünde de sessizce yeniler).
 * Odaktayken başka cihazdaki değişiklikler ve uygulamanın ön plana dönmesi de sessiz yenileme
 * tetikler (bkz. `useRealtimeRefresh`). `load` kararlı olmalı (useCallback). Eski isteklerin
 * sonucu yok sayılır.
 */
export function useRemoteData<T>(
  load: () => Promise<T>,
  errorFallback: string,
  options: RemoteDataOptions = {},
): RemoteData<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<RemoteStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const hasData = useRef(false);

  const run = useCallback(
    async (mode: Mode) => {
      const id = ++requestId.current;
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'initial') {
        setStatus('loading');
        setError(null);
      }
      try {
        const result = await load();
        if (id !== requestId.current) return;
        hasData.current = true;
        setData(result);
        setStatus('ready');
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        const message = toUserMessage(err, errorFallback);
        setError(message);
        // Ekranda veri varsa onu korur; hata yalnızca bant olarak gösterilir.
        if (!hasData.current) setStatus('error');
      } finally {
        if (id === requestId.current) setRefreshing(false);
      }
    },
    [load, errorFallback],
  );

  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      void run(hasData.current ? 'silent' : 'initial');
      setFocused(true);
      return () => setFocused(false);
    }, [run]),
  );

  const dataRef = useRef<T | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const live = options.live ?? DEFAULT_LIVE_TABLES;
  useRealtimeRefresh({
    name: 'remote',
    tables: live || [],
    enabled: focused && live !== false,
    ignore: (payload) => isUnrelatedDelete(payload, dataRef.current),
    // İlk yükleme bitmeden gelen olaylar zaten yüklemede; yalnızca veri varken yenile.
    onChange: () => {
      if (hasData.current) void run('silent');
    },
  });

  const refresh = useCallback(() => run('refresh'), [run]);
  const retry = useCallback(() => run('initial'), [run]);

  return { data, status, error, refreshing, refresh, retry, setData };
}
