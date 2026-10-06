import { monthGrid, monthOf, monthTitle, shiftMonth } from './calendar';

describe('calendar helpers', () => {
  it('lays out October 2026 starting on a Thursday', () => {
    const weeks = monthGrid({ year: 2026, month: 10 });
    expect(weeks[0]).toEqual([null, null, null, '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(weeks[weeks.length - 1]).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', null]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
  });

  it('handles a month that starts on Monday and a leap February', () => {
    expect(monthGrid({ year: 2026, month: 6 })[0]![0]).toBe('2026-06-01');
    expect(monthGrid({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
  });

  it('shifts months across years and writes Turkish titles', () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthOf('2026-10-06')).toEqual({ year: 2026, month: 10 });
    expect(monthTitle({ year: 2026, month: 10 })).toBe('Ekim 2026');
  });
});
