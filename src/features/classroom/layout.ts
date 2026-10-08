import { iconSize, spacing } from '@/theme';
import type { FormOption } from '@/types/database';

/** Classroom sizing is independent of the shared heading typography. */
export const OPTION_FONT = 18;
export const SLOT_SIZE = 24;
export const MARK_SIZE = iconSize.md;
export const TILE_PADDING = 12;
export const GRID_GAP = 16;
export const MIN_TILE = 184;
export const MAX_TILE = 284;
export const MAX_COLUMNS = 9;
export const COMPACT_WIDTH = 900;

export type QuickOption = 'plus' | 'minus' | 'half';

/** Only familiar score controls can safely replace their visible label with − / ½. */
export function quickOption(option: FormOption): QuickOption | null {
  const label = option.label.trim().toLocaleLowerCase('tr-TR');
  if (label === 'artı' && option.tone === 'positive' && option.score === 1) return 'plus';
  if (label === 'eksi' && option.tone === 'negative' && option.score === -1) return 'minus';
  if (label === 'yarım artı' && option.tone === 'positive' && option.score === 0.5) return 'half';
  return null;
}

export function hasQuickOptions(options: readonly FormOption[]): boolean {
  const kinds = options.map(quickOption);
  return options.length >= 2 && options.length <= 3 && kinds.every(Boolean)
    && new Set(kinds).size === kinds.length && kinds.includes('plus') && kinds.includes('minus');
}

/** Generic options wrap in two columns; labels never dictate the whole board's density. */
export function optionButtonWidth(label: string, withCount: boolean): number {
  return spacing.sm * 2 + MARK_SIZE + spacing.sm + Math.ceil(label.length * OPTION_FONT * 0.56)
    + (withCount ? spacing.sm + SLOT_SIZE : 0);
}

/** Seven columns at 1440 px for plus/minus; oral marks and 2–12 custom options get more room. */
export function tileMinWidth(options: readonly FormOption[], _repeatable: boolean): number {
  if (!options.length) return MIN_TILE;
  return hasQuickOptions(options) ? (options.length === 2 ? MIN_TILE : 264) : MAX_TILE;
}

export function columnsFor(width: number, minTile: number): number {
  const usable = width - GRID_GAP * 2;
  return Math.max(1, Math.min(MAX_COLUMNS, Math.floor((usable + GRID_GAP) / (minTile + GRID_GAP))));
}

export function tileWidth(width: number, columns: number): number {
  const usable = Math.max(0, width - GRID_GAP * 2);
  return Math.max(0, Math.floor((usable - GRID_GAP * (columns - 1)) / columns));
}
