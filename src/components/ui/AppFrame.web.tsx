import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { WEB_MAX_CONTENT_WIDTH } from '@/lib/platform';
import { colors, palette, radii, spacing, strokes } from '@/theme';

/**
 * Masaüstü çerçeve ölçüleri. public/index.html içindeki CSS (sayfa zemini) aynı eşiği
 * kullanır; birini değiştirirseniz ikisini de değiştirin. Sheet panelleri sütuna
 * `overlayColumnStyle` ile yerleşir.
 */
export const appFrame = {
  /** Sütun genişliği: telefon için tasarlanmış ekranlar bu genişlikte rahat okunur. */
  width: WEB_MAX_CONTENT_WIDTH,
  /** Bu genişlikten itibaren sütun, noktalı "defter masası" üstünde kâğıt bir sütun olarak durur. */
  framedMinWidth: 600,
  /** Masa ile kâğıt sütunun üst kenarı arasındaki boşluk. */
  inset: spacing.xxl,
  /** Kâğıt sütunun kalın kurşun çerçevesi. */
  border: strokes.base,
  /** Kâğıt sütunun üst köşeleri. */
  radius: radii.lg,
} as const;

export type AppFrameMode = 'full' | 'framed';

/** Pencere boyutuna göre çerçeve biçimi: dar ekranda (mobil web) tam genişlik. */
export function appFrameMode(width: number, _height?: number): AppFrameMode {
  return width < appFrame.framedMinWidth ? 'full' : 'framed';
}

/**
 * Modal içindeki panelin (Sheet) duracağı kutu: kâğıt sütunun iç kutusuyla (çerçevenin içi) birebir
 * aynı yer ve köşe. Perde (scrim) tüm sayfayı karartır; panel ise bu kutunun altına yaslanır ve dışına
 * taşmaz. `headerHeight`: sütunun üstündeki uygulama çubuğunun ölçülen yüksekliği (yoksa 0).
 * Dar ekranda (mobil web) null: panel tüm ekranı kullanır.
 */
export function overlayColumnStyle(width: number, height: number, headerHeight = 0): ViewStyle | null {
  if (appFrameMode(width, height) === 'full') return null;
  const top = headerHeight + appFrame.inset + appFrame.border;
  const radius = appFrame.radius - appFrame.border;
  return {
    position: 'absolute',
    top,
    bottom: 0,
    left: Math.round((width - appFrame.width) / 2) + appFrame.border,
    width: appFrame.width - appFrame.border * 2,
    height: Math.max(0, height - top),
    overflow: 'hidden',
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
  };
}

/** Sütunun üstündeki uygulama çubuğunun ölçülen yüksekliği (AppFrame doldurur). */
const HeaderHeightContext = createContext(0);

/** `overlayColumnStyle` pencere boyutuyla; iOS/Android'de hep null (AppFrame.tsx). */
export function useOverlayColumnStyle(): ViewStyle | null {
  const { width, height } = useWindowDimensions();
  const headerHeight = useContext(HeaderHeightContext);
  return overlayColumnStyle(width, height, headerHeight);
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
 * Web: telefon için tasarlanmış ekranlar masaüstünde ortada, okunur genişlikte durur.
 * Geniş tarayıcıda "defter masası" görünümü: noktalı zemin üstünde kalın kurşun çerçeveli, sağa sert
 * gölgeli bir kâğıt sütun (mockup `.dotbg` + `.sheet`); üstünde isteğe bağlı `header` (uygulama çubuğu). Dar
 * tarayıcılarda (mobil web) tam genişliktir, `header` çizilmez ve iOS uygulamasıyla aynı görünür.
 */
export function AppFrame({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const framed = appFrameMode(width, height) === 'framed';
  const rootRef = useRef<View>(null);
  const frameRef = useRef<View>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const showHeader = framed && Boolean(header);

  // Masaüstünde sütunun dışındaki masada tekerlek, sütundaki listeyi kaydırır (sayfanın
  // kendisi kaymaz; yoksa tekerlek "ölü" hissettirir).
  useEffect(() => {
    if (!framed) return;
    const root = rootRef.current as unknown;
    const frame = frameRef.current as unknown;
    if (!(root instanceof HTMLElement) || !(frame instanceof HTMLElement)) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || !(event.target instanceof Node) || frame.contains(event.target)) return;
      const target = findScrollTarget(frame, event.clientY);
      if (target) target.scrollBy({ top: wheelPixels(event, target.clientHeight) });
    };
    root.addEventListener('wheel', onWheel, { passive: true });
    return () => root.removeEventListener('wheel', onWheel);
  }, [framed]);

  const onHeaderLayout = (event: LayoutChangeEvent) => setHeaderHeight(event.nativeEvent.layout.height);

  return (
    <HeaderHeightContext.Provider value={showHeader ? headerHeight : 0}>
      <View ref={rootRef} style={styles.root} testID="app-frame">
        {/* Laptop uygulama çubuğu (mockup `.appbar`): yalnızca masaüstü genişliğinde, kâğıt sütunun üstünde. */}
        {showHeader ? <View onLayout={onHeaderLayout}>{header}</View> : null}
        <View style={[styles.page, framed && styles.desk]}>
          <View ref={frameRef} style={[styles.frame, framed && styles.framed]} testID={`app-frame-${framed ? 'framed' : 'full'}`}>
            {children}
          </View>
        </View>
      </View>
    </HeaderHeightContext.Provider>
  );
}

// Noktalı zemin: düz renkli noktalar (degrade değil, tekrar eden desen). RN tipinde olmadığı için nesne olarak verilir.
const dots = {
  backgroundImage: `radial-gradient(${palette.defterNokta} 1.3px, transparent 1.4px)`,
  backgroundSize: '24px 24px',
} as object;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  desk: {
    backgroundColor: palette.defter,
    paddingTop: appFrame.inset,
    ...dots,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: appFrame.width,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  framed: {
    borderWidth: appFrame.border,
    borderBottomWidth: 0,
    borderColor: colors.outline,
    borderTopLeftRadius: appFrame.radius,
    borderTopRightRadius: appFrame.radius,
    // Yalnızca sağa sert gölge: mockup `6px 0 0`.
    boxShadow: `6px 0px 0px ${colors.outline}`,
  },
});
