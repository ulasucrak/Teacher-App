import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type PressableStateCallbackType,
  type ViewProps,
} from 'react-native';

import { alertQueue, type AlertDialogButton, type AlertRequest } from '@/lib/platformAlert';
import { colors, elevation, fontFamilies, layout, motion, radii, spacing, typography, useReducedMotion } from '@/theme';

import { Text } from './Text';

/** iOS alert genişliği (270) biraz büyütülmüş: Türkçe eylem adları ("Kaydetmeden çık") sığsın. */
const CARD_WIDTH = 300;
/** Açılışta kart bu ölçekten 1'e iner (iOS alert'i gibi hafif "yaklaşma"). */
const OPEN_SCALE = 1.08;

/**
 * Web'de `Alert.alert` çağrılarını uygulama içi iletişim kutusuyla gösterir (iOS alert görünümü):
 * ortada kart, başlık, mesaj, gerçek adlı düğmeler; perde, solma + ölçek animasyonu.
 * Escape iptal eder, Enter birincil düğmeye basar, odak kutuda tutulur (RN Web Modal), `role=alertdialog`.
 * Kuyruk ve düğme eşlemesi `@/lib/platformAlert`'tedir; bu bileşen app/_layout.tsx'te bir kez bağlanır.
 */
export function AlertDialogHost() {
  const head = useSyncExternalStore(alertQueue.subscribe, alertQueue.current, () => null);
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState<AlertRequest | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(1));
  const cardRef = useRef<View>(null);

  // Sıradaki istek hemen bağlanır; gösterilen kapanınca animasyon bitince ayrılır.
  if (!shown && head) setShown(head);
  const open = shown !== null && head?.id === shown.id;
  const shownId = shown?.id ?? null;

  useEffect(() => {
    if (shownId === null) return;
    if (open) {
      opacity.setValue(0);
      scale.setValue(reducedMotion ? 1 : OPEN_SCALE);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.duration.base,
          easing: motion.easing.standard,
          useNativeDriver: false,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: motion.duration.base,
          easing: motion.easing.standard,
          useNativeDriver: false,
        }),
      ]).start();
      return;
    }
    // Kapanış: iOS gibi yalnızca solar.
    Animated.timing(opacity, {
      toValue: 0,
      duration: motion.duration.fast,
      easing: motion.easing.standard,
      useNativeDriver: false,
    }).start(() => setShown(null));
  }, [shownId, open, opacity, scale, reducedMotion]);

  // Açılınca odak kutuya taşınır (ekran okuyucu başlık + mesajı okur; Tab düğmelere gider).
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => domNode(cardRef.current)?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, shownId]);

  // Enter → birincil düğme. Odak bir düğmedeyse o düğme kendi basışını yapar.
  useEffect(() => {
    if (!open || shownId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.isComposing) return;
      const card = domNode(cardRef.current);
      const active = document.activeElement;
      if (card && active && active !== card && card.contains(active) && active.getAttribute('role') === 'button') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      alertQueue.confirm(shownId);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, shownId]);

  if (!shown) return null;
  const titleId = `alert-${shown.id}-title`;
  const messageId = `alert-${shown.id}-message`;
  const ariaProps = {
    role: 'alertdialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': shown.message ? messageId : undefined,
    tabIndex: -1,
  } as ViewProps;

  return (
    <Modal visible transparent animationType="none" onRequestClose={() => alertQueue.cancel(shown.id)}>
      <Animated.View style={[styles.scrim, { opacity }]} />
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          ref={cardRef}
          testID="alert-dialog"
          {...ariaProps}
          style={[styles.card, { opacity, transform: [{ scale }] }]}
        >
          <View style={styles.content}>
            <Text variant="heading" align="center" nativeID={titleId} testID="alert-title">
              {shown.title}
            </Text>
            {shown.message ? (
              <Text variant="bodySmall" align="center" nativeID={messageId} testID="alert-message">
                {shown.message}
              </Text>
            ) : null}
          </View>
          <View style={shown.stacked ? styles.column : styles.row}>
            {shown.buttons.map((button, i) => (
              <DialogButton
                key={button.index}
                button={button}
                stacked={shown.stacked}
                first={i === 0}
                onPress={() => alertQueue.press(shown.id, button.index)}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DialogButton({
  button,
  stacked,
  first,
  onPress,
}: {
  button: AlertDialogButton;
  stacked: boolean;
  first: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="button"
      testID={`alert-button-${button.index}`}
      onPress={onPress}
      style={(state) => [
        styles.button,
        stacked ? styles.buttonStacked : styles.buttonInRow,
        !stacked && !first && styles.buttonDivider,
        isHighlighted(state) && styles.buttonHighlighted,
      ]}
    >
      <Text
        align="center"
        style={[styles.label, button.kind === 'cancel' && styles.labelCancel]}
        color={button.kind === 'destructive' ? colors.danger : colors.primary}
      >
        {button.text}
      </Text>
    </Pressable>
  );
}

/** RN Web Pressable durumu `hovered` / `focused` da taşır (RN tiplerinde yok). */
function isHighlighted(state: PressableStateCallbackType): boolean {
  const web = state as PressableStateCallbackType & { hovered?: boolean; focused?: boolean };
  return Boolean(state.pressed || web.hovered || web.focused);
}

/** RN Web'de bileşen ref'i DOM öğesidir. */
function domNode(ref: unknown): HTMLElement | null {
  return ref instanceof HTMLElement ? ref : null;
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  anchor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  card: {
    ...elevation.overlay,
    shadowOffset: { width: 0, height: 8 },
    width: '100%',
    maxWidth: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    // Kart programatik odak alır; tarayıcı çerçevesi yerine kartın kendisi görünür.
    outlineWidth: 0,
  },
  content: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  row: { flexDirection: 'row', borderTopWidth: layout.hairline, borderTopColor: colors.rule },
  column: { flexDirection: 'column' },
  button: {
    minHeight: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buttonInRow: { flex: 1, flexBasis: 0 },
  buttonStacked: { borderTopWidth: layout.hairline, borderTopColor: colors.rule },
  buttonDivider: { borderLeftWidth: layout.hairline, borderLeftColor: colors.rule },
  buttonHighlighted: { backgroundColor: colors.pressedOverlay },
  label: { ...typography.body },
  labelCancel: { fontFamily: fontFamilies.textBold },
});
