/** Radius hiyerarşisi — bkz. docs/DESIGN.md §6. Her şeye aynı radius verilmez. */
export const radii = {
  none: 0,
  /** Rozet. */
  xs: 6,
  /** Giriş alanı, çip, buton. */
  sm: 10,
  /** Kart, toast. */
  md: 14,
  /** Sheet üst köşeleri. */
  lg: 24,
  full: 999,
} as const;
