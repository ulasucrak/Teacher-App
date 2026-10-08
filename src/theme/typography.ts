import type { TextStyle } from 'react-native';

/**
 * Yazı tipleri — bkz. docs/DESIGN.md §4.
 * Anahtarlar `fonts.ts` içindeki `fontAssets` ile (app/_layout.tsx `useFonts`) aynı olmalı.
 * v3: başlıklar Bricolage 800, vurgulu metin Atkinson 800; 600/700 başlık ağırlıkları paketlenmez.
 */
export const fontFamilies = {
  /** Bricolage Grotesque 800: tüm başlıklar, büyük sayılar. */
  displayExtraBold: 'BricolageGrotesque_800ExtraBold',
  textRegular: 'AtkinsonHyperlegibleNext_400Regular',
  textBold: 'AtkinsonHyperlegibleNext_700Bold',
  /** Atkinson 800: ad, buton, etiket, rozet. */
  textExtraBold: 'AtkinsonHyperlegibleNext_800ExtraBold',
  /** @deprecated v2 adı; `displayExtraBold` ile aynı fontu verir (700/600 artık paketlenmiyor). */
  displayBold: 'BricolageGrotesque_800ExtraBold',
  /** @deprecated v2 adı; `displayExtraBold` ile aynı fontu verir. */
  displaySemiBold: 'BricolageGrotesque_800ExtraBold',
  /** @deprecated v2 adı; `textBold` ile aynı fontu verir. */
  textSemiBold: 'AtkinsonHyperlegibleNext_700Bold',
} as const;

export type TextVariant =
  | 'hero'
  | 'poster'
  | 'display'
  | 'title'
  | 'headline'
  | 'heading'
  | 'bodyStrong'
  | 'body'
  | 'bodySmall'
  | 'label'
  | 'caption'
  | 'number';

/**
 * Ölçek: başlıklar Bricolage 800 (sıkı satır, negatif aralık — posterden fırlamış), metin Atkinson.
 * v3 değişiklikleri: `display` 34→40, `title` 28→32, `heading` 19→20 (21 değil: Sınıf modu seçenek genişliği hesabı `typography.heading` boyutuna bağlı, bkz. features/classroom/layout.ts), `caption` 13→14,
 * `bodyStrong`/`label` bir kademe kalın; yeni: `hero`, `poster`, `headline`.
 */
export const typography: Record<TextVariant, TextStyle> = {
  /** Sınıf adı bloğu ("5/B"): sayfadaki en büyük yazı. */
  hero: { fontFamily: fontFamilies.displayExtraBold, fontSize: 80, lineHeight: 72, letterSpacing: -4 },
  /** Kök ekran büyük başlığı ("Sınıflarım"). */
  poster: { fontFamily: fontFamilies.displayExtraBold, fontSize: 44, lineHeight: 46, letterSpacing: -1.5 },
  /** Yalnızca giriş ekranı: "Sınıf Defteri"; sayaç/puan gibi büyük sayılar. */
  display: { fontFamily: fontFamilies.displayExtraBold, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  /** Sihirbaz sorusu, ikincil büyük başlık, toplam sayısı. */
  title: { fontFamily: fontFamilies.displayExtraBold, fontSize: 32, lineHeight: 36, letterSpacing: -0.9 },
  /** Bölüm başlığı ("Formlar", "Öğrenciler"). */
  headline: { fontFamily: fontFamilies.displayExtraBold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  /** Üst çubuk başlığı, sheet başlığı, satır sonu sayı. */
  heading: { fontFamily: fontFamilies.displayExtraBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  bodyStrong: { fontFamily: fontFamilies.textExtraBold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamilies.textRegular, fontSize: 17, lineHeight: 24 },
  bodySmall: { fontFamily: fontFamilies.textRegular, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fontFamilies.textBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fontFamilies.textRegular, fontSize: 14, lineHeight: 19 },
  number: {
    fontFamily: fontFamilies.textBold,
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
