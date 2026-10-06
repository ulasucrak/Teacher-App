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

export const layout = {
  /** Sayfa yatay iç boşluğu (v2: 20 — daha çok nefes). */
  pageX: spacing.xl,
  /** En küçük dokunma alanı (iOS 44 pt / Android 48 dp → 48). */
  minTouch: 48,
  /** Seçenek çipi yüksekliği (ızgara). */
  chipHeight: 44,
  /** Kompakt seçenek çipi (ChipGroup); hitSlop ile 48'e tamamlanır. */
  chipHeightCompact: 40,
  /** Buton yüksekliği (tek elle, başparmak için büyük). */
  buttonHeight: 56,
  /** Küçük buton (hitSlop ile 48'e tamamlanır). */
  buttonHeightSm: 40,
  /** Yüzen birincil eylem (FAB) yüksekliği. */
  fabHeight: 56,
  /** FAB'lı listelerde son satırın FAB altında kalmaması için alt boşluk. */
  fabClearance: 56 + 32,
  /** Üst çubuk yüksekliği. */
  headerHeight: 52,
  /** Liste satırı en küçük yüksekliği. */
  rowHeight: 64,
  /** Okul numarası sütunu genişliği: 4 basamaklı e-Okul numarası ("1104") kesilmeden sığar. */
  numberColumn: 44,
  /** @deprecated v1 kırmızı kenar çizgisi kalınlığı; v2'de çizgi ince ayraçtır. */
  marginRuleWidth: 1,
  /** İkon kutusu (boş durum, uygulama işareti). */
  iconBox: 64,
  /** Okunabilir metin genişliği üst sınırı. */
  readableWidth: 420,
  /** Sihirbaz adım çubuğu kalınlığı. */
  stepBar: 4,
  hairline: 1,
  inputBorder: 1.5,
  inputBorderFocus: 2,
} as const;
