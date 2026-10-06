/**
 * Radius hiyerarşisi — bkz. docs/DESIGN.md §6. Her şeye aynı radius verilmez:
 * içteki küçük öğe küçük, dıştaki taşıyıcı büyük köşe alır.
 */
export const radii = {
  none: 0,
  /** Rozet, ton noktası kutusu. */
  xs: 6,
  /** Giriş alanı, seçenek çipi, banner. */
  sm: 12,
  /** Buton, kart, toast. */
  md: 16,
  /** Sheet üst köşeleri. */
  lg: 28,
  /** Hap: FAB, filtre çipi, avatar. */
  full: 999,
} as const;
