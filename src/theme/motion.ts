import { useEffect, useState } from 'react';
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
} as const;

/** "Hareketi azalt" ayarını izler. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
