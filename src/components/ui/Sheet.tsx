import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isWeb, WEB_MAX_SHEET_WIDTH } from '@/lib/platform';
import { colors, elevation, iconSize, layout, motion, radii, spacing, useReducedMotion } from '@/theme';

import { useOverlayColumnStyle } from './AppFrame';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Kapanış animasyonu bitip panel ekrandan tamamen kalktığında bir kez çağrılır
   * (iOS'ta Modal `onDismiss`, diğer platformlarda animasyon sonu). Ardından ikinci bir
   * Modal/Alert açmak için kullanın; iOS aynı anda iki modal sunamaz.
   */
  onDismissed?: () => void;
  /** Başlığın altında tek satırlık açıklama (isteğe bağlı). */
  description?: string;
  /** Panele `testID`, kapat düğmesine `${testID}-close` verilir. */
  testID?: string;
}

/** iOS Modal'ı yerel olarak kapanınca `onDismiss` bildirir; diğer platformlarda bildirim yok. */
const hasNativeDismiss = () => Platform.OS === 'ios';

/** Alttan açılan basit seçici / panel (RN Modal üstüne). Perdeye dokununca kapanır. */
export function Sheet({ visible, onClose, title, children, footer, onDismissed, description, testID }: SheetProps) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  // Web masaüstü: perde tüm sayfayı karartır, panel uygulama sütununun içinde kalır.
  const column = useOverlayColumnStyle();
  const height = typeof column?.height === 'number' ? column.height : windowHeight;
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  const onDismissedRef = useRef(onDismissed);
  useEffect(() => {
    onDismissedRef.current = onDismissed;
  }, [onDismissed]);
  const notifyDismissed = useCallback(() => onDismissedRef.current?.(), []);

  // Açılırken hemen bağla; kapanışta animasyon bitince ayır.
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
        if (!hasNativeDismiss()) notifyDismissed();
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
      onDismiss={hasNativeDismiss() ? notifyDismissed : undefined}
      statusBarTranslucent
    >
      <Animated.View style={[styles.scrim, { opacity: progress }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        />
      </Animated.View>
      <View style={[styles.anchor, column]} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          testID={testID}
          style={[
            styles.sheet,
            isWeb && styles.webSheet,
            { maxHeight: height * 0.85, paddingBottom: Math.max(insets.bottom, spacing.lg) },
            { opacity: reducedMotion ? progress : 1, transform: [{ translateY }] },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.titles}>
              <Text variant="heading" accessibilityRole="header">
                {title}
              </Text>
              {description ? (
                <Text variant="bodySmall" tone="muted">
                  {description}
                </Text>
              ) : null}
            </View>
            <IconButton
              icon="close"
              variant="tonal"
              size={iconSize.md}
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /** Web'de masaüstü genişliğinde panel ortada, okunur genişlikte durur. */
  webSheet: { width: '100%', maxWidth: WEB_MAX_SHEET_WIDTH, alignSelf: 'center' },
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
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingLeft: layout.pageX,
    paddingRight: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  titles: { flex: 1, gap: spacing.xxs, paddingTop: spacing.sm },
  body: { paddingHorizontal: layout.pageX, paddingBottom: spacing.lg },
  footer: { paddingHorizontal: layout.pageX, paddingTop: spacing.sm },
});
