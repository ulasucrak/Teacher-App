import { useRef } from 'react';
import { Platform, type PressableStateCallbackType, type View, type ViewStyle } from 'react-native';

import { motion } from '@/theme';

/**
 * Seçim denetimlerinin (SegmentedChoice, SegmentedTabs, OptionChip/OptionGrid, ChipGroup, Chip)
 * ortak web davranışları: üzerine gelme / basma geri bildirimi ve radiogroup ok tuşları.
 * Yerelde (iOS/Android) hiçbiri etkin değildir; görünüm ve davranış aynı kalır.
 */

/** Çağrı anında bakılır (testlerde Platform.OS değiştirilebilsin). */
const onWeb = () => Platform.OS === 'web';

/** RN Web Pressable durumu `hovered` da taşır (RN tiplerinde yok). Yerelde hep false. */
export function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}

/** Web'de yumuşak geçiş (CSS transition); RN tipinde olmadığı için genişletilmiş stil. */
const webTransition = {
  transitionProperty: 'transform, background-color',
  transitionDuration: `${motion.duration.fast}ms`,
  transitionTimingFunction: 'ease-out',
} as unknown as ViewStyle;

const webPressed: ViewStyle = { transform: [{ scale: motion.pressScale }] };
const webPressedReduced: ViewStyle = { opacity: 0.85 };

/**
 * Web'de basılıyken iOS'taki gibi hafif küçülme (0.96) + geçiş; "hareketi azalt" açıksa
 * yalnızca opaklık. Yerelde `undefined` (yerel bileşenlerin kendi geri bildirimi var).
 */
export function webPressFeedback(pressed: boolean, reducedMotion = false): ViewStyle[] | undefined {
  if (!onWeb()) return undefined;
  if (reducedMotion) return pressed ? [webPressedReduced] : undefined;
  return pressed ? [webTransition, webPressed] : [webTransition];
}

export type RadioKeyStep = 'next' | 'prev' | 'first' | 'last';

/** WAI-ARIA radiogroup / tablist: ←↑ önceki, →↓ sonraki, Home / End uçlar. */
export function radioKeyStep(key: string): RadioKeyStep | null {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return 'next';
    case 'ArrowLeft':
    case 'ArrowUp':
      return 'prev';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
}

/** Ok tuşuyla gidilecek dizin (uçlarda başa / sona sarar). */
export function nextRadioIndex(current: number, count: number, step: RadioKeyStep): number {
  if (count <= 0) return -1;
  switch (step) {
    case 'first':
      return 0;
    case 'last':
      return count - 1;
    case 'next':
      return current < 0 ? 0 : (current + 1) % count;
    case 'prev':
      return current < 0 ? count - 1 : (current - 1 + count) % count;
  }
}

interface KeyLikeEvent {
  key?: string;
  nativeEvent?: { key?: string; target?: unknown };
  target?: unknown;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault?: () => void;
}

export interface RovingItemProps {
  ref?: (node: View | null) => void;
  tabIndex?: 0 | -1;
}

export interface RovingRadio {
  /** Grup kapsayıcısına (radiogroup / tablist View'ı) yayılır. Yerelde boş. */
  groupProps: Record<string, unknown>;
  /** i. öğenin Pressable'ına: ref + tabIndex (yalnızca seçili öğe Tab durağı). Yerelde boş. */
  itemProps: (index: number) => RovingItemProps;
}

/**
 * Web radiogroup klavye gezintisi: ok tuşları seçimi değiştirir ve odağı taşır
 * (roving tabindex). `selectedIndex` < 0 ise ilk öğe Tab durağıdır.
 */
export function useRovingRadio(
  count: number,
  selectedIndex: number,
  select: (index: number) => void,
  disabled = false,
): RovingRadio {
  const nodes = useRef<(View | null)[]>([]);

  if (!onWeb()) return { groupProps: {}, itemProps: () => ({}) };

  const onKeyDown = (e: KeyLikeEvent) => {
    if (disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = radioKeyStep(e.key ?? e.nativeEvent?.key ?? '');
    if (!step) return;
    const target = e.nativeEvent?.target ?? e.target;
    const focused = nodes.current.findIndex(
      (n) => n != null && (n === target || (n as unknown as Node).contains?.(target as Node)),
    );
    const current = focused >= 0 ? focused : selectedIndex;
    const next = nextRadioIndex(current, count, step);
    e.preventDefault?.();
    if (next < 0 || next === current) return;
    select(next);
    (nodes.current[next] as unknown as { focus?: () => void } | null)?.focus?.();
  };

  const tabStop = selectedIndex >= 0 && selectedIndex < count ? selectedIndex : 0;
  return {
    groupProps: { onKeyDown },
    itemProps: (index) => ({
      ref: (node) => {
        nodes.current[index] = node;
      },
      tabIndex: disabled || index === tabStop ? undefined : -1,
    }),
  };
}
