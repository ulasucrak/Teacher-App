import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, elevation, layout, motion, radii, spacing, tones, type ToneName } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  /** Kısa onay: eylemle aynı fiil ("Kaydet" → "Kaydedildi"). */
  show: (message: string, kind?: ToastKind) => void;
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

  const show = useCallback((message: string, kind: ToastKind = 'success') => {
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

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + spacing.huge + spacing.xxxl }]}>
          <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite">
            <Icon name={kindIcon[toast.kind]} size={20} color={tones[kindTone[toast.kind]].soft} />
            <Text variant="label" tone="inverse" style={styles.text}>
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
    ...elevation.overlay,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: layout.readableWidth,
  },
  text: { flexShrink: 1 },
});
