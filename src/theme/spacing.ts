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
  /** Sayfa yatay iç boşluğu. */
  pageX: spacing.lg,
  /** En küçük dokunma alanı (iOS 44 pt / Android 48 dp → 48). */
  minTouch: 48,
  /** Seçenek çipi yüksekliği. */
  chipHeight: 44,
  /** Buton yüksekliği. */
  buttonHeight: 52,
  /** Küçük buton (hitSlop ile 48'e tamamlanır). */
  buttonHeightSm: 40,
  /** Üst çubuk yüksekliği. */
  headerHeight: 52,
  /** Okul numarası sütunu genişliği (kenar çizgisinin solu). */
  numberColumn: 36,
  /** Kırmızı kenar çizgisi kalınlığı. */
  marginRuleWidth: 1.5,
  /** İkon kutusu (boş durum, başlık kartı). */
  iconBox: 56,
  /** Okunabilir metin genişliği üst sınırı. */
  readableWidth: 420,
  hairline: 1,
  inputBorder: 1.5,
  inputBorderFocus: 2,
} as const;
