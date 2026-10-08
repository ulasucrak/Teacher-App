import { useIsFocused, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createWebLeaveGuard, showLeavePrompt, type LeaveGuard, type LeaveGuardOptions, type WebLeaveGuard } from './leaveGuard';

export type { LeaveGuard, LeaveGuardOptions, LeavePrompt } from './leaveGuard';

/**
 * Kaydedilmemiş değişiklik koruması (web). Native sürümdeki `beforeRemove` + onaya ek olarak,
 * ekran odaktayken ve `dirty` iken:
 * - tarayıcı geri tuşu / kaydırma / Alt+← yakalanır (işaret geçmiş kaydı), uygulamanın Alert'i
 *   (AlertDialog) sorulur; yalnızca onaylanırsa geri gidilir,
 * - yenileme ve sekme kapatma `beforeunload` ile uyarır.
 * `dirty` bitince, odak kaybolunca ve ekran kapanınca koruma kaldırılır.
 */
export function useLeaveGuard(options: LeaveGuardOptions): LeaveGuard {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const optionsRef = useRef(options);
  const allowedRef = useRef(false);
  const promptingRef = useRef(false);
  const [guard, setGuard] = useState<WebLeaveGuard | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  });

  const ask = useCallback((onConfirm: () => void) => {
    if (promptingRef.current) return;
    promptingRef.current = true;
    showLeavePrompt(optionsRef.current.prompt(), onConfirm, () => {
      promptingRef.current = false;
    });
  }, []);

  // Denetleyici ekranla birlikte yaşar.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const created = createWebLeaveGuard(window, {
      onLeaveAttempt: () => {
        if (allowedRef.current) return;
        ask(() => {
          allowedRef.current = true;
          void created.disarm().then(() => {
            if (navigation.canGoBack()) navigation.goBack();
            else window.history.back();
          });
        });
      },
    });
    setGuard(created);
    return () => created.destroy();
  }, [navigation, ask]);

  const active = options.dirty && focused;
  useEffect(() => {
    if (!guard) return;
    if (active && !allowedRef.current) guard.arm();
    else void guard.disarm();
  }, [guard, active]);

  // Uygulama içi çıkış (kapat düğmesi, router.back) — native ile aynı.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowedRef.current || !optionsRef.current.dirty) return;
      event.preventDefault();
      ask(() => {
        allowedRef.current = true;
        const proceed = () => navigation.dispatch(event.data.action);
        if (guard) void guard.disarm().then(proceed);
        else proceed();
      });
    });
    return unsubscribe;
  }, [navigation, guard, ask]);

  const leave = useCallback(
    (navigate: () => void) => {
      allowedRef.current = true;
      if (guard) void guard.disarm().then(navigate);
      else navigate();
    },
    [guard],
  );

  return useMemo(() => ({ leave }), [leave]);
}
