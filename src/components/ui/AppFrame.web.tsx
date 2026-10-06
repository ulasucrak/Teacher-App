import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { colors, radii, spacing } from '@/theme';

/**
 * Masaüstü çerçeve ölçüleri. public/index.html içindeki CSS (modal/sheet'leri sütuna
 * sığdıran kurallar ve sayfa zemini) aynı sayıları kullanır; birini değiştirirseniz ikisini de
 * değiştirin.
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
 * Web: telefon için tasarlanmış ekranlar masaüstünde, hafif renkli sayfa zemini üzerinde ortalı
 * bir uygulama sütunu olarak durur (yer varsa gölge + yuvarlak köşe). Dar tarayıcılarda (mobil
 * web) tam genişliktir ve iOS uygulamasıyla aynı görünür.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const mode = appFrameMode(width, height);
  return (
    <View style={[styles.page, mode !== 'full' && styles.pageTinted]} testID="app-frame">
      <View
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
