/**
 * Radius hiyerarşisi — bkz. docs/DESIGN.md §6. v3: köşeler "kesilmiş kâğıt" gibi daha kararlı;
 * hap (`full`) yalnızca sayaç/nokta/rozet-yuvarlak içindir. FAB, arama, çip, avatar artık hap DEĞİL.
 */
export const radii = {
  none: 0,
  /** Rozet, küçük onay kutusu, avatar (küçük). */
  xs: 8,
  /** Giriş alanı, çip, ikon kutusu, kare ikon düğmesi, banner, segment. */
  sm: 12,
  /** Buton, kart, FAB, toast. */
  md: 16,
  /** Sheet üst köşeleri, hero kâğıt blok. */
  lg: 22,
  /** Yalnızca daire: sayaç, nokta, damga, puan dairesi. */
  full: 999,
} as const;
