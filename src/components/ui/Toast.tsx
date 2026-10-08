import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, hardShadow, iconSize, layout, motion, radii, spacing, tones, type ToneName } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ToastKind = 'success' | 'error' | 'info';
export type ToastTarget = (message: string, kind: ToastKind) => void;

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  /** Kısa onay: eylemle aynı fiil ("Kaydet" → "Kaydedildi"). */
  show: (message: string, kind?: ToastKind) => void;
  /**
   * Route notifications exclusively to this target until cleanup. The latest
   * registration wins; removing it restores the previous target. The target
   * owns presentation, dismissal and accessibility announcements. Existing
   * root notifications are cleared on registration and are never replayed.
   */
  routeTo: (target: ToastTarget) => () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const kindTone: Record<ToastKind, ToneName> = { success: 'positive', error: 'negative', info: 'neutral' };
const kindIcon: Record<ToastKind, IconName> = { success: 'success', error: 'error', info: 'info' };

/** Alt kenarda kısa süreli bildirim. Kök layout'ta bir kez sarın. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();
  const counter = useRef(0);
  const targets = useRef<{ notify: ToastTarget }[]>([]);

  const routeTo = useCallback((notify: ToastTarget) => {
    const registration = { notify };
    targets.current.push(registration);
    setToast(null);
    return () => {
      targets.current = targets.current.filter((target) => target !== registration);
    };
  }, []);

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
    const target = targets.current[targets.current.length - 1];
    if (target) {
      target.notify(message, kind);
      return;
    }
    counter.current += 1;
    setToast({ id: counter.current, message, kind });
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: motion.duration.base, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: motion.duration.base, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) setToast((current) => (current?.id === toast.id ? null : current));
        },
      );
    }, motion.toastVisibleMs);
    return () => clearTimeout(timer);
  }, [toast, opacity]);

  const value = useMemo(() => ({ show, routeTo }), [show, routeTo]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + spacing.huge + spacing.xxxl }]}>
          <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite">
            <Icon name={kindIcon[toast.kind]} size={iconSize.lg} color={tones[kindTone[toast.kind]].solid} />
            <Text variant="bodyStrong" tone="inverse" style={styles.text}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast, ToastProvider içinde kullanılmalı.');
  return ctx;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: layout.pageX, right: layout.pageX, alignItems: 'center' },
  toast: {
    // Kurşun kâğıt + sarı sert gölge (mockup `.toast`): panoya iliştirilmiş not.
    ...hardShadow('md', colors.accent),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    maxWidth: layout.readableWidth,
  },
  text: { flexShrink: 1 },
});
