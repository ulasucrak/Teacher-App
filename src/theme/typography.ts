import type { TextStyle } from 'react-native';

/**
 * Yazı tipleri — bkz. docs/DESIGN_V2.md §4.
 * Anahtarlar app/_layout.tsx içinde `useFonts` ile yüklenen adlarla aynı olmalı.
 */
export const fontFamilies = {
  displayBold: 'BricolageGrotesque_700Bold',
  displaySemiBold: 'BricolageGrotesque_600SemiBold',
  textRegular: 'AtkinsonHyperlegibleNext_400Regular',
  textSemiBold: 'AtkinsonHyperlegibleNext_600SemiBold',
  textBold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'bodyStrong'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'number';

/**
 * Ölçek: başlıklar Bricolage (sıkı satır, hafif negatif aralık), metin Atkinson (geniş satır).
 * v2: başlık ağırlığı azaltıldı, `heading` 20 → 19; buton etiketi `bodyStrong` 17.
 */
export const typography: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fontFamilies.displayBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.7 },
  title: { fontFamily: fontFamilies.displayBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  heading: { fontFamily: fontFamilies.displaySemiBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  bodyStrong: { fontFamily: fontFamilies.textBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamilies.textRegular, fontSize: 17, lineHeight: 24 },
  bodySmall: { fontFamily: fontFamilies.textRegular, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fontFamilies.textSemiBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.textRegular, fontSize: 13, lineHeight: 18 },
  number: {
    fontFamily: fontFamilies.textSemiBold,
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
};

/** Dinamik yazı boyutu üst sınırları. */
export const fontScale = {
  max: 1.4,
  dense: 1.2,
} as const;
