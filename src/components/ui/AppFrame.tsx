import type { ReactNode } from 'react';

/** Mobilde uygulama tüm ekranı kullanır; çerçeve ve üst çubuk yalnızca web'de vardır (AppFrame.web.tsx). */
export function AppFrame({ children }: { children: ReactNode; header?: ReactNode }) {
  return children;
}
