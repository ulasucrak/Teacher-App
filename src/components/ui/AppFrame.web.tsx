import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

/**
 * Masaüstü çerçeve ölçüleri. public/index.html içindeki CSS (sayfa zemini) aynı eşiği
 * kullanır; birini değiştirirseniz ikisini de değiştirin. Sheet panelleri sütuna
 * `overlayColumnStyle` ile yerleşir.
 */
export const appFrame = {
  /** Sütun genişliği: telefon için tasarlanmış ekranlar bu genişlikte rahat okunur. */
  width: 520,
  /** Bu genişlikten itibaren sütun, renkli sayfa zemininde gölgeli bir kart olarak durur. */
  framedMinWidth: 600,
  /** Bu yükseklikten itibaren kartın üstünde/altında boşluk ve yuvarlak köşe olur. */
  floatingMinHeight: 720,
  /** Yüzen kartın üst/alt boşluğu. */
  inset: spacing.xxl,
  radius: radii.lg,
} as const;

export type AppFrameMode = 'full' | 'framed' | 'floating';

/** Pencere boyutuna göre çerçeve biçimi: dar ekranda tam genişlik. */
export function appFrameMode(width: number, height: number): AppFrameMode {
  if (width < appFrame.framedMinWidth) return 'full';
  return height >= appFrame.floatingMinHeight ? 'floating' : 'framed';
}

/**
 * Modal içindeki panelin (Sheet) duracağı kutu: uygulama sütunuyla birebir aynı yer ve köşe.
 * Perde (scrim) tüm sayfayı karartır; panel ise bu kutunun altına yaslanır ve dışına taşmaz.
 * Dar ekranda (mobil web) null: panel tüm ekranı kullanır.
 */
export function overlayColumnStyle(width: number, height: number): ViewStyle | null {
  const mode = appFrameMode(width, height);
  if (mode === 'full') return null;
  const inset = mode === 'floating' ? appFrame.inset : 0;
  return {
    position: 'absolute',
    top: inset,
    bottom: inset,
    left: Math.round((width - appFrame.width) / 2),
    width: appFrame.width,
    height: height - inset * 2,
    overflow: 'hidden',
    borderRadius: mode === 'floating' ? appFrame.radius : 0,
  };
}

/** `overlayColumnStyle` pencere boyutuyla; iOS/Android'de hep null (AppFrame.tsx). */
export function useOverlayColumnStyle(): ViewStyle | null {
  const { width, height } = useWindowDimensions();
  return overlayColumnStyle(width, height);
}

/** Sütunun içinde, verilen yükseklikte dikey kaydırılabilen ilk öğe (yoksa sütunun ortasındaki). */
function findScrollTarget(frame: HTMLElement, clientY: number): HTMLElement | null {
  const rect = frame.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const clampedY = Math.min(Math.max(clientY, rect.top + 1), rect.bottom - 1);
  for (const y of [clampedY, rect.top + rect.height / 2]) {
    let el = document.elementFromPoint(x, y);
    while (el instanceof HTMLElement && frame.contains(el)) {
      const { overflowY } = getComputedStyle(el);
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
      el = el.parentElement;
    }
  }
  return null;
}

/** Fare tekerleği ölçeği: satır/sayfa birimli olayları piksele çevirir. */
function wheelPixels(event: WheelEvent, pageHeight: number): number {
  if (event.deltaMode === 1) return event.deltaY * 16;
  if (event.deltaMode === 2) return event.deltaY * pageHeight;
  return event.deltaY;
}

/**
 * Web: telefon için tasarlanmış ekranlar masaüstünde, hafif renkli sayfa zemini üzerinde ortalı
 * bir uygulama sütunu olarak durur (yer varsa gölge + yuvarlak köşe). Dar tarayıcılarda (mobil
 * web) tam genişliktir ve iOS uygulamasıyla aynı görünür.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const mode = appFrameMode(width, height);
  const pageRef = useRef<View>(null);
  const frameRef = useRef<View>(null);

  // Masaüstünde sütunun dışındaki gri zeminde tekerlek, sütundaki listeyi kaydırır (sayfanın
  // kendisi kaymaz; yoksa tekerlek "ölü" hissettirir).
  useEffect(() => {
    if (mode === 'full') return;
    const page = pageRef.current as unknown;
    const frame = frameRef.current as unknown;
    if (!(page instanceof HTMLElement) || !(frame instanceof HTMLElement)) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || !(event.target instanceof Node) || frame.contains(event.target)) return;
      const target = findScrollTarget(frame, event.clientY);
      if (target) target.scrollBy({ top: wheelPixels(event, target.clientHeight) });
    };
    page.addEventListener('wheel', onWheel, { passive: true });
    return () => page.removeEventListener('wheel', onWheel);
  }, [mode]);

  return (
    <View ref={pageRef} style={[styles.page, mode !== 'full' && styles.pageTinted]} testID="app-frame">
      <View
        ref={frameRef}
        style={[styles.frame, mode !== 'full' && styles.framed, mode === 'floating' && styles.floating]}
        testID={`app-frame-${mode}`}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  pageTinted: { backgroundColor: colors.surfaceMuted },
  frame: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  framed: {
    maxWidth: appFrame.width,
    boxShadow: '0 0 0 1px rgba(29, 33, 41, 0.04), 0 12px 40px rgba(29, 33, 41, 0.10)',
  },
  floating: {
    marginVertical: appFrame.inset,
    borderRadius: appFrame.radius,
  },
});
