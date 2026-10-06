import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton, Text } from '@/components/ui';
import { colors, elevation, layout, motion, radii, spacing, useReducedMotion } from '@/theme';

export interface KeyboardSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Panel kapanıp ekrandan kalkınca bir kez (ardından başka bir modal açmak için). */
  onDismissed?: () => void;
  testID?: string;
}

/**
 * `Sheet` ile aynı görünüm, ama klavye açılınca yukarı kayar (alanlı formlar için).
 * Ortak `Sheet` klavyeden kaçmadığı için bu özellik içinde tutuluyor.
 */
export function KeyboardSheet({ visible, onClose, title, children, footer, onDismissed, testID }: KeyboardSheetProps) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));

  const onDismissedRef = useRef(onDismissed);
  useEffect(() => {
    onDismissedRef.current = onDismissed;
  }, [onDismissed]);
  const notifyDismissed = useCallback(() => onDismissedRef.current?.(), []);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: motion.duration.slow,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
        // iOS'ta Modal `onDismiss` bildirir; diğer platformlarda animasyon sonu.
        if (Platform.OS !== 'ios') notifyDismissed();
      }
    });
  }, [visible, mounted, progress, notifyDismissed]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [reducedMotion ? 0 : height * 0.3, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      onDismiss={Platform.OS === 'ios' ? notifyDismissed : undefined}
      statusBarTranslucent
    >
      <Animated.View style={[styles.scrim, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" />
      </Animated.View>
      <KeyboardAvoidingView
        style={styles.anchor}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <Animated.View
          accessibilityViewIsModal
          testID={testID}
          style={[
            styles.sheet,
            { maxHeight: height * 0.9, paddingBottom: Math.max(insets.bottom, spacing.lg) },
            { opacity: reducedMotion ? progress : 1, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text variant="heading" accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <IconButton
              icon="close"
              accessibilityLabel="Kapat"
              onPress={onClose}
              testID={testID ? `${testID}-close` : undefined}
            />
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    ...elevation.overlay,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  handle: {
    alignSelf: 'center',
    width: spacing.xxxl + spacing.xs,
    height: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.rule,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: layout.pageX + spacing.xs,
    paddingRight: spacing.xs,
    paddingTop: spacing.xs,
  },
  title: { flex: 1 },
  body: { paddingHorizontal: layout.pageX, paddingBottom: spacing.lg, gap: spacing.lg },
  footer: { paddingHorizontal: layout.pageX, paddingTop: spacing.sm, gap: spacing.sm },
});
