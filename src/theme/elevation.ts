import type { ViewStyle } from 'react-native';

import { colors } from './colors';
import { strokes } from './spacing';

/**
 * Sert (ofsetli, bulanıksız) gölge — v3'ün imzası. `boxShadow` RN 0.76+ ile iOS, Android (API 28+)
 * ve react-native-web'de aynı biçimde çalışır; eski Android'de gölge çizilmez ama kalın çerçeve
 * kalır (bilgi kaybı yok). Doğrudan `boxShadow` yazmayın; bu yardımcıları kullanın.
 */
export const shadowOffset = {
  /** İkon kutusu, küçük düğme, seçili çip. */
  xs: 2,
  /** Kart, küçük buton, arama. */
  sm: 3,
  /** Buton, FAB, toast. */
  md: 4,
  /** Hero blok, pano kartı (karo). */
  lg: 5,
} as const;

export type ShadowSize = keyof typeof shadowOffset;

/** `hardShadow('md')` → `{ boxShadow: '4px 4px 0px #141414' }`. Renk verilmezse kurşun. */
export function hardShadow(size: ShadowSize | number = 'md', color: string = colors.shadow): ViewStyle {
  const o = typeof size === 'number' ? size : shadowOffset[size];
  return { boxShadow: `${o}px ${o}px 0px ${color}` };
}

/**
 * Basılı ("gömülme") durumu: gölge kaybolur, öğe gölgenin olduğu yere kayar.
 * Basılabilir öğenin stilinde `pressed ? pressedIn('md') : hardShadow('md')` biçiminde kullanın.
 */
export function pressedIn(size: ShadowSize | number = 'md'): ViewStyle {
  const o = typeof size === 'number' ? size : shadowOffset[size];
  return { transform: [{ translateX: o }, { translateY: o }] };
}

/**
 * Yükselti seviyeleri (v2 adları korunur). v3'te gölge yumuşak değil sert:
 * - `flat`: yok.
 * - `raised`: alt eylem çubuğu — gölge yerine üstte kalın kurşun çizgi.
 * - `floating`: FAB — 4 px sert gölge.
 * - `overlay`: sheet — gölge yok (perde + kalın çerçeve yeter); toast kendi sarı gölgesini taşır.
 */
export const elevation: Record<'flat' | 'raised' | 'floating' | 'overlay', ViewStyle> = {
  flat: {},
  raised: { borderTopWidth: strokes.base, borderTopColor: colors.outline },
  floating: hardShadow('md'),
  overlay: {},
};
