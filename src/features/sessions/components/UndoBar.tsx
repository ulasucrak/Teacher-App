import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { colors, elevation, layout, motion, radii, spacing } from '@/theme';

export const UNDO_VISIBLE_MS = 6000;

export interface UndoBarProps {
  /** Değişince yeniden gösterilir; null → gizli. */
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
}

/**
 * Toplu işlem sonrası geri alma bandı (Toast eylem desteklemediği için yerel).
 * Liste alanının altında, alt çubuğun hemen üstünde durur.
 */
export function UndoBar({ message, onUndo, onDismiss }: UndoBarProps) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) return;
    AccessibilityInfo.announceForAccessibility(`${message}. Geri almak için Geri al düğmesini kullanın.`);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: motion.duration.base, useNativeDriver: true }).start();
    const timer = setTimeout(onDismiss, UNDO_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, opacity, onDismiss]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.bar, { opacity }]} accessibilityLiveRegion="polite">
      <Text variant="label" tone="inverse" style={styles.text}>
        {message}
      </Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel="Geri al"
        hitSlop={spacing.xs}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      >
        <Text variant="label" color={colors.primaryMuted}>
          Geri al
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    ...elevation.overlay,
    position: 'absolute',
    left: layout.pageX,
    right: layout.pageX,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    minHeight: layout.minTouch + spacing.sm,
  },
  text: { flex: 1 },
  action: {
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  actionPressed: { backgroundColor: colors.pressedOverlay },
});
