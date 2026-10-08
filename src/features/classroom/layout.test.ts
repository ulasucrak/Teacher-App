import { PRESETS } from '@/features/forms/presets';
import type { FormOption } from '@/types/database';

import { GRID_GAP, MAX_COLUMNS, MAX_TILE, MIN_TILE, OPTION_FONT, columnsFor, hasQuickOptions, optionButtonWidth, quickOption, tileMinWidth, tileWidth } from './layout';

const options = (id: string) => PRESETS.find((p) => p.id === id)!.options;

it('uses compact controls only for recognisable artı/eksi scores, retaining custom labels', () => {
  expect(hasQuickOptions(options('artieksi'))).toBe(true);
  expect(hasQuickOptions(options('sozlu'))).toBe(true);
  expect(hasQuickOptions(options('yoklama'))).toBe(false);
  expect(quickOption({ key: 'x', label: 'Dikkat', tone: 'negative', score: -1 })).toBeNull();
  expect(quickOption({ key: 'x', label: 'Artı', tone: 'positive', score: 2 })).toBeNull();
});

it('keeps density independent of theme heading and permits wrapping for up to twelve options', () => {
  expect(OPTION_FONT).toBe(18);
  expect(optionButtonWidth('Yarım artı', false)).toBeGreaterThan(optionButtonWidth('Artı', false));
  expect(optionButtonWidth('Artı', true)).toBeGreaterThan(optionButtonWidth('Artı', false));
  expect(tileMinWidth(options('artieksi'), true)).toBe(MIN_TILE);
  expect(tileMinWidth(options('sozlu'), false)).toBe(264);
  expect(tileMinWidth(options('odev'), false)).toBe(MAX_TILE);
  const many = Array.from({ length: 12 }, (_, i): FormOption => ({ key: String(i), label: `Uzun seçenek ${i}`, tone: 'neutral' }));
  expect(tileMinWidth(many, true)).toBe(MAX_TILE);
  expect(tileMinWidth([], false)).toBe(MIN_TILE);
});

it('matches the seven-column laptop board and adapts without horizontal overflow', () => {
  const min = tileMinWidth(options('artieksi'), true);
  expect(columnsFor(1440, min)).toBe(7);
  expect(columnsFor(1920, min)).toBe(9);
  expect(columnsFor(1280, min)).toBe(6);
  expect(columnsFor(390, min)).toBe(1);
  expect(columnsFor(1440, tileMinWidth(options('sozlu'), false))).toBe(5);
  for (const width of [320, 390, 768, 1024, 1280, 1366, 1440, 1536, 1920, 2560]) {
    const columns = columnsFor(width, min);
    expect(columns).toBeGreaterThanOrEqual(1);
    expect(columns).toBeLessThanOrEqual(MAX_COLUMNS);
    expect(tileWidth(width, columns) * columns + GRID_GAP * (columns + 1)).toBeLessThanOrEqual(width);
  }
});
