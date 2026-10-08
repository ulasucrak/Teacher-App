import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { colors, hardShadow, layout, motion, radii, spacing } from '@/theme';

export const UNDO_VISIBLE_MS = 6000;

export interface UndoBarProps {
  /** Değişince yeniden gösterilir; null → gizli. */
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
  /** Alttan uzaklık; alt çubuğu olmayan ekranlarda güvenli alan eklenir. */
  bottom?: number;
}

/**
 * Toplu işlem sonrası geri alma bandı (Toast eylem desteklemediği için yerel; görünümü Toast ile aynı).
 * Liste alanının altında, alt çubuğun hemen üstünde durur.
 */
export function UndoBar({ message, onUndo, onDismiss, bottom = spacing.md }: UndoBarProps) {
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
    <Animated.View style={[styles.bar, { opacity, bottom }]} accessibilityLiveRegion="polite">
      <Text variant="bodyStrong" tone="inverse" style={styles.text}>
        {message}
      </Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel="Geri al"
        hitSlop={spacing.xs}
        style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
      >
        <Text variant="bodyStrong" color={colors.accent}>
          Geri al
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    // Toast ile aynı dil: kurşun zemin + sarı sert gölge; sarı yazı kurşun üstünde 12:1.
    ...hardShadow('md', colors.accent),
    position: 'absolute',
    left: layout.pageX,
    right: layout.pageX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.text,
    borderRadius: radii.md,
    paddingLeft: spacing.lg + spacing.xxs,
    paddingRight: spacing.xs,
    minHeight: layout.fabHeight,
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
