import { PRESETS } from '@/features/forms/presets';

import { MAX_COLUMNS, MAX_TILE, MIN_TILE, columnsFor, optionButtonWidth, tileMinWidth, tileWidth } from './layout';

const options = (id: string) => PRESETS.find((p) => p.id === id)!.options;

it('sizes the tile from the option buttons and clamps it to readable bounds', () => {
  expect(optionButtonWidth('Yarım artı', false)).toBeGreaterThan(optionButtonWidth('Artı', false));
  expect(optionButtonWidth('Artı', true)).toBeGreaterThan(optionButtonWidth('Artı', false));
  expect(tileMinWidth(options('artieksi'), true)).toBeGreaterThanOrEqual(MIN_TILE);
  // Altı seçenekli ödev en geniş kartta sarar.
  expect(tileMinWidth(options('odev'), false)).toBe(MAX_TILE);
  expect(tileMinWidth([], false)).toBe(MIN_TILE);
});

it('fits a 40-student class on common projector widths without horizontal overflow', () => {
  const artiEksi = tileMinWidth(options('artieksi'), true);
  expect(columnsFor(1920, artiEksi)).toBe(5);
  expect(columnsFor(1280, artiEksi)).toBe(3);
  expect(columnsFor(390, artiEksi)).toBe(1);
  const sozlu = tileMinWidth(options('sozlu'), false);
  expect(columnsFor(1280, sozlu)).toBe(3);
  expect(columnsFor(1920, sozlu)).toBe(5);
  for (const width of [320, 390, 768, 1024, 1280, 1366, 1536, 1920, 2560]) {
    const columns = columnsFor(width, artiEksi);
    expect(columns).toBeGreaterThanOrEqual(1);
    expect(columns).toBeLessThanOrEqual(MAX_COLUMNS);
    const card = tileWidth(width, columns);
    // Kartlar + aralıklar genişliği aşmaz.
    expect(card * columns + 8 * (columns + 1)).toBeLessThanOrEqual(width);
  }
});
