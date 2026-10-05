import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type SetStateAction } from 'react';

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

/**
 * Ekran odaklandığında veriyi yükler (başka ekrandan dönüldüğünde de sessizce yeniler).
 * `load` kararlı olmalı (useCallback). Eski isteklerin sonucu yok sayılır.
 */
export function useRemoteData<T>(load: () => Promise<T>, errorFallback: string): RemoteData<T> {
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

  useFocusEffect(
    useCallback(() => {
      void run(hasData.current ? 'silent' : 'initial');
    }, [run]),
  );

  const refresh = useCallback(() => run('refresh'), [run]);
  const retry = useCallback(() => run('initial'), [run]);

  return { data, status, error, refreshing, refresh, retry, setData };
}
