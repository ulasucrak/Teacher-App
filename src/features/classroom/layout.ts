import { iconSize, layout, spacing, typography } from '@/theme';
import type { FormOption } from '@/types/database';

/**
 * Sınıf modu ızgarasının ölçüleri (saf; testlenir). Kart genişliği seçenek düğmelerinin tek satıra
 * sığacağı genişlikten hesaplanır: 2–3 seçenekli formlarda 1920 px'te 5–6, 1280 px'te 3–4 sütun.
 * Uzun seçenek listeleri (ödev: 6 seçenek) en geniş kartta sarar.
 */

/** Seçenek etiketi (Atkinson Bold) için ortalama harf genişliği / yazı boyutu oranı. */
const LABEL_ADVANCE = 0.56;
/** Seçenek düğmesi etiket boyutu (projeksiyonda arka sıradan okunur). */
export const OPTION_FONT: number = typography.heading.fontSize ?? typography.bodyStrong.fontSize ?? spacing.lg;
/** Düğmedeki sayı / seçim yuvası (çap). */
export const SLOT_SIZE = spacing.xxl + spacing.xs;
/** Ton işareti (+ − ! ○) boyutu. */
export const MARK_SIZE = iconSize.md;
/** Kart iç boşluğu. */
export const TILE_PADDING = spacing.md;
/** Kartlar arası ve ızgara kenarı boşluğu. */
export const GRID_GAP = spacing.sm;
/** En dar kart: 28 pt ad en az ~10 harf sığar. */
export const MIN_TILE = Math.round((layout.readableWidth * 2) / 3);
/** En geniş kart; daha uzun seçenek listeleri bu genişlikte iki satıra sarar. */
export const MAX_TILE = layout.readableWidth;
export const MAX_COLUMNS = 6;
/** Bunun altındaki genişlikte (telefon, dikey tablet) başlık ve alt çubuk alt alta dizilir. */
export const COMPACT_WIDTH = layout.readableWidth * 2;

/**
 * Bir seçenek düğmesinin tahmini en küçük genişliği: iç boşluk + işaret + etiket (+ birikimlide
 * sayı rozeti). Günlükte seçim işareti (✓) ton işaretinin yerine geçer; genişlik değişmez.
 */
export function optionButtonWidth(label: string, withCount: boolean): number {
  const text = Math.ceil(label.length * OPTION_FONT * LABEL_ADVANCE);
  return spacing.sm * 2 + MARK_SIZE + spacing.sm + text + (withCount ? spacing.sm + SLOT_SIZE : 0);
}

/** Düğmeler (birikimlide sayı rozeti ve sondaki geri alma ikonuyla) tek satıra sığacak kart genişliği. */
export function tileMinWidth(options: readonly Pick<FormOption, 'label'>[], repeatable: boolean): number {
  const buttons = options.reduce((sum, option) => sum + optionButtonWidth(option.label, repeatable), 0);
  const gaps = Math.max(0, options.length - 1) * spacing.sm;
  const undo = repeatable ? layout.minTouch + spacing.sm : 0;
  const content = buttons + gaps + undo;
  return Math.min(MAX_TILE, Math.max(MIN_TILE, content + TILE_PADDING * 2));
}

/** Kullanılabilir genişliğe sığan sütun sayısı (1–6). */
export function columnsFor(width: number, minTile: number): number {
  const usable = width - GRID_GAP * 2;
  return Math.max(1, Math.min(MAX_COLUMNS, Math.floor((usable + GRID_GAP) / (minTile + GRID_GAP))));
}

/** Sütun sayısına göre kart genişliği (son satırdaki kartlar da aynı genişlikte kalır). */
export function tileWidth(width: number, columns: number): number {
  const usable = width - GRID_GAP * 2;
  return Math.floor((usable - GRID_GAP * (columns - 1)) / columns);
}
