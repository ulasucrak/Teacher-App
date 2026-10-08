import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

/** Hareket kuralları — bkz. docs/DESIGN.md §7. */
export const motion = {
  duration: {
    fast: 120,
    base: 200,
    slow: 280,
  },
  easing: {
    standard: Easing.out(Easing.cubic),
  },
  pressScale: 0.96,
  toastVisibleMs: 2400,
  /** "Aferin" damgası: yukarıdan iner, 380 ms'de oturur (yalnız reduced motion kapalıyken). */
  stampMs: 380,
} as const;

// "Hareketi azalt" ayarı tek bir paylaşılan abonelikle izlenir (yüzlerce çip için tek dinleyici).
let reducedMotion = false;
let initialized = false;
const listeners = new Set<() => void>();

function ensureSubscribed() {
  if (initialized) return;
  initialized = true;
  const update = (value: boolean) => {
    reducedMotion = value;
    listeners.forEach((l) => l());
  };
  AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => undefined);
  AccessibilityInfo.addEventListener('reduceMotionChanged', update);
}

function subscribe(listener: () => void) {
  ensureSubscribed();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** "Hareketi azalt" açık mı? Açıksa ölçek/kayma yerine yalnızca opaklık kullanın. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => reducedMotion, () => false);
}
