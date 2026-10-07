import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { showLeavePrompt, type LeaveGuard, type LeaveGuardOptions } from './leaveGuard';

export type { LeaveGuard, LeaveGuardOptions, LeavePrompt } from './leaveGuard';

/**
 * Kaydedilmemiş değişiklik koruması (iOS/Android): `dirty` iken ekrandan çıkış (geri, kapat,
 * Android geri tuşu) `beforeRemove` ile durdurulur ve Alert ile onay sorulur.
 * Web sürümü `useLeaveGuard.web.ts` (tarayıcı geri tuşu, yenileme, sekme kapatma da korunur).
 *
 * iOS kaydırarak geri dönüşü `beforeRemove` durduramaz; ekranlar `gestureEnabled: !dirty` verir.
 */
export function useLeaveGuard(options: LeaveGuardOptions): LeaveGuard {
  const navigation = useNavigation();
  const optionsRef = useRef(options);
  const allowedRef = useRef(false);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowedRef.current || !optionsRef.current.dirty) return;
      event.preventDefault();
      showLeavePrompt(optionsRef.current.prompt(), () => {
        allowedRef.current = true;
        navigation.dispatch(event.data.action);
      });
    });
    return unsubscribe;
  }, [navigation]);

  const leave = useCallback((navigate: () => void) => {
    allowedRef.current = true;
    navigate();
  }, []);

  return useMemo(() => ({ leave }), [leave]);
}
