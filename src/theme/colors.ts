/**
 * Renk token'ları — bkz. docs/DESIGN.md §3.
 * Uygulamanın geri kalanında hex renk yazılmaz; buradan içe aktarılır.
 */

/** Ana palet: çizgili defter + tükenmez kalem. */
export const palette = {
  kagit: '#FFFFFF',
  satir: '#EEF1F6',
  murekkep: '#1A2033',
  tukenmez: '#2343B5',
  kirmiziKalem: '#B8292F',
  kenarCizgisi: '#E5A3A3',
} as const;

export const colors = {
  // Yüzeyler
  background: palette.kagit,
  surface: palette.kagit,
  surfaceMuted: palette.satir,
  // Metin
  text: palette.murekkep,
  textMuted: '#5A6478',
  textInverse: palette.kagit,
  // Çizgiler
  rule: '#DCE4F2',
  border: '#7C869A',
  marginRule: palette.kenarCizgisi,
  // Eylem
  primary: palette.tukenmez,
  primaryPressed: '#1B3591',
  primaryMuted: '#DCE3F7',
  primaryMutedText: '#4A5A9A',
  danger: palette.kirmiziKalem,
  dangerPressed: '#962127',
  // Diğer
  scrim: 'rgba(26, 32, 51, 0.4)',
  shadow: palette.murekkep,
  pressedOverlay: 'rgba(26, 32, 51, 0.06)',
} as const;

export type ToneName = 'positive' | 'neutral' | 'warning' | 'negative';

export interface ToneColors {
  /** Seçili dolgu; üstünde `onSolid` metin (≥4.5:1). */
  solid: string;
  solidPressed: string;
  onSolid: string;
  /** Açık zemin + ton metni (rozet, nokta, banner). */
  soft: string;
  onSoft: string;
}

export const tones: Record<ToneName, ToneColors> = {
  positive: {
    solid: '#1A7046',
    solidPressed: '#135636',
    onSolid: palette.kagit,
    soft: '#E3F2EA',
    onSoft: '#1A7046',
  },
  neutral: {
    solid: palette.tukenmez,
    solidPressed: '#1B3591',
    onSolid: palette.kagit,
    soft: '#E8EDFB',
    onSoft: palette.tukenmez,
  },
  warning: {
    solid: '#9A5B00',
    solidPressed: '#7A4800',
    onSolid: palette.kagit,
    soft: '#FBF0DA',
    onSoft: '#9A5B00',
  },
  negative: {
    solid: palette.kirmiziKalem,
    solidPressed: '#962127',
    onSolid: palette.kagit,
    soft: '#FBE7E7',
    onSoft: palette.kirmiziKalem,
  },
};

/**
 * Avatar arka planları: soluk, mürekkep metinle ≥ 9:1.
 * Sıra değişirse öğrenci renkleri değişir — sona ekleyin.
 */
export const avatarColors = [
  '#DDE7F7', // satır mavisi
  '#F6E3C4', // kraft kâğıt
  '#DDEFE4', // tahta yeşili soluk
  '#F4DCDC', // pembe silgi
  '#E6E0F3', // mor mürekkep soluk
  '#E2ECEE', // kurşun kalem grisi
] as const;
