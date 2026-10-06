import {
  ALL_TIME,
  formatRange,
  isAllTime,
  isInRange,
  lastDaysRange,
  matchRangePreset,
  monthRange,
  normalizeRange,
  rangeForPreset,
  rangeToRpcArgs,
  weekRange,
} from './range';

describe('normalizeRange', () => {
  it('drops invalid days and swaps reversed ends', () => {
    expect(normalizeRange({ from: '2026-10-07', to: '2026-10-01' })).toEqual({ from: '2026-10-01', to: '2026-10-07' });
    expect(normalizeRange({ from: 'dün', to: '2026-02-30' })).toEqual(ALL_TIME);
    expect(normalizeRange(null)).toEqual(ALL_TIME);
    expect(normalizeRange({ to: '2026-10-06' })).toEqual({ from: null, to: '2026-10-06' });
  });
});

describe('isInRange', () => {
  it('includes both ends and treats null ends as open', () => {
    const range = { from: '2026-10-01', to: '2026-10-07' };
    expect(isInRange('2026-10-01', range)).toBe(true);
    expect(isInRange('2026-10-07', range)).toBe(true);
    expect(isInRange('2026-09-30', range)).toBe(false);
    expect(isInRange('2026-10-08', range)).toBe(false);
    expect(isInRange('1999-01-01', ALL_TIME)).toBe(true);
    expect(isInRange('2030-01-01', { from: '2026-10-01', to: null })).toBe(true);
    expect(isInRange('2026-09-01', { from: null, to: '2026-10-01' })).toBe(true);
  });

  it('knows all time', () => {
    expect(isAllTime(ALL_TIME)).toBe(true);
    expect(isAllTime({ from: 'x', to: null })).toBe(true);
    expect(isAllTime({ from: '2026-10-01', to: null })).toBe(false);
  });
});

describe('preset ranges', () => {
  it('week runs Monday to Sunday', () => {
    // 6 Ekim 2026 salı
    expect(weekRange('2026-10-06')).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    // Pazar → önceki pazartesi
    expect(weekRange('2026-10-11')).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    // Pazartesi
    expect(weekRange('2026-10-05')).toEqual({ from: '2026-10-05', to: '2026-10-11' });
    // Yıl geçişi
    expect(weekRange('2027-01-01')).toEqual({ from: '2026-12-28', to: '2027-01-03' });
  });

  it('month covers the whole calendar month', () => {
    expect(monthRange('2026-10-06')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange('2026-02-14')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthRange('2028-02-29')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });

  it('last N days includes today', () => {
    expect(lastDaysRange(30, '2026-10-06')).toEqual({ from: '2026-09-07', to: '2026-10-06' });
    expect(lastDaysRange(1, '2026-10-06')).toEqual({ from: '2026-10-06', to: '2026-10-06' });
    expect(lastDaysRange(0, '2026-10-06')).toEqual({ from: '2026-10-06', to: '2026-10-06' });
  });

  it('maps presets both ways', () => {
    expect(rangeForPreset('all', '2026-10-06')).toEqual(ALL_TIME);
    expect(matchRangePreset(rangeForPreset('month', '2026-10-06'), '2026-10-06')).toBe('month');
    expect(matchRangePreset(ALL_TIME, '2026-10-06')).toBe('all');
    expect(matchRangePreset({ from: '2026-10-02', to: '2026-10-03' }, '2026-10-06')).toBeNull();
  });
});

describe('formatRange', () => {
  it('names ranges without suffix guesswork', () => {
    expect(formatRange(ALL_TIME)).toBe('Tüm zamanlar');
    expect(formatRange({ from: '2026-10-06', to: '2026-10-06' })).toBe('6 Ekim 2026');
    expect(formatRange({ from: '2026-10-01', to: '2026-10-07' })).toBe('1 – 7 Ekim 2026');
    expect(formatRange({ from: '2026-09-28', to: '2026-10-04' })).toBe('28 Eylül – 4 Ekim 2026');
    expect(formatRange({ from: '2025-12-29', to: '2026-01-04' })).toBe('29 Aralık 2025 – 4 Ocak 2026');
    expect(formatRange({ from: '2026-09-01', to: null })).toBe('1 Eylül 2026 ve sonrası');
    expect(formatRange({ from: null, to: '2026-10-06' })).toBe('6 Ekim 2026 ve öncesi');
  });
});

describe('rangeToRpcArgs', () => {
  it('omits open ends', () => {
    expect(rangeToRpcArgs(ALL_TIME)).toEqual({});
    expect(rangeToRpcArgs({ from: '2026-10-07', to: '2026-10-01' })).toEqual({ p_from: '2026-10-01', p_to: '2026-10-07' });
    expect(rangeToRpcArgs({ from: null, to: '2026-10-01' })).toEqual({ p_to: '2026-10-01' });
  });
});
