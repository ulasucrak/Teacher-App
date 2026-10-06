import type { ReactNode } from 'react';

/** Mobilde uygulama tüm ekranı kullanır; çerçeve yalnızca web'de vardır (AppFrame.web.tsx). */
export function AppFrame({ children }: { children: ReactNode }) {
  return children;
}
