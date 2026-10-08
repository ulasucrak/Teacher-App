import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

/** Mobilde uygulama tüm ekranı kullanır; çerçeve ve üst çubuk yalnızca web'de vardır (AppFrame.web.tsx). */
export function AppFrame({ children }: { children: ReactNode; header?: ReactNode }) {
  return children;
}

/** Panelin duracağı sütun kutusu yalnızca web masaüstünde vardır (AppFrame.web.tsx). */
export function useOverlayColumnStyle(): ViewStyle | null {
  return null;
}
