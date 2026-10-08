/** 4 tabanlı boşluk ölçeği — bkz. docs/DESIGN.md §5. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

/** Çizgi (çerçeve) kalınlıkları — v3: her şey kalın kurşun çizgiyle ayrılır. */
export const strokes = {
  /** Rozet çerçevesi. */
  fine: 1.5,
  /** İkon kutusu, avatar, ayraç, seçili olmayan çip. */
  thin: 2,
  /** Standart: buton, kart, alan, segment, üst çubuk çizgisi. */
  base: 2.5,
  /** Vurgu: odaktaki alan, sınıf etiketi kenarı. */
  heavy: 3,
} as const;

export const layout = {
  /** Sayfa yatay iç boşluğu (v2: 20). */
  pageX: spacing.xl,
  /** En küçük dokunma alanı (iOS 44 pt / Android 48 dp → 48). */
  minTouch: 48,
  /** Seçenek çipi yüksekliği (ızgara). */
  chipHeight: 44,
  /** Kompakt seçenek çipi (ChipGroup); hitSlop ile 48'e tamamlanır. */
  chipHeightCompact: 40,
  /** Buton yüksekliği (tek elle, başparmak için büyük). */
  buttonHeight: 56,
  /** Küçük buton (mockup `btn-s` 44; hitSlop ile 48+). */
  buttonHeightSm: 44,
  /** Yüzen birincil eylem (FAB) yüksekliği (mockup 58). */
  fabHeight: 58,
  /** FAB'lı listelerde son satırın FAB altında kalmaması için alt boşluk. */
  fabClearance: 58 + 32,
  /** Üst çubuk yüksekliği (mockup 62). */
  headerHeight: 62,
  /** Kare ikon düğmesi (üst çubuk geri / ⋯): mockup `.sq` 46. */
  squareButton: 46,
  /** Liste satırı en küçük yüksekliği (mockup `mrow` 72). */
  rowHeight: 72,
  /** Okul numarası sütunu genişliği: 4 basamaklı e-Okul numarası ("1104") kesilmeden sığar. */
  numberColumn: 44,
  /** @deprecated v1 kırmızı kenar çizgisi kalınlığı; çizgi artık ayraçtır. */
  marginRuleWidth: 2,
  /** İkon kutusu (boş durum, uygulama işareti). */
  iconBox: 64,
  /** Satır başı ikon kutusu (mockup `icb` 46). */
  iconTile: 46,
  /** Okunabilir metin genişliği üst sınırı. */
  readableWidth: 420,
  /** Sihirbaz adım çubuğu kalınlığı. */
  stepBar: 10,
  /** Ayraç çizgisi kalınlığı (v3: 2 px; adı v1'den kalma). */
  hairline: strokes.thin,
  /** Giriş alanı kenarı (kurşun). */
  inputBorder: strokes.base,
  /** Odaktaki giriş alanı kenarı. */
  inputBorderFocus: strokes.base,
  /** Standart çerçeve kalınlığı (kart/buton). */
  stroke: strokes.base,
} as const;
