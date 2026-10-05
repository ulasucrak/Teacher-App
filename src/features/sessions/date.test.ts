import { addDays, formatSessionDate, formatShortDate, relativeDayLabel, todayIso } from './date';

describe('formatSessionDate', () => {
  it('formats a date in Turkish with the weekday', () => {
    expect(formatSessionDate('2026-10-06')).toBe('6 Ekim 2026 Salı');
    expect(formatSessionDate('2026-10-05')).toBe('5 Ekim 2026 Pazartesi');
    expect(formatSessionDate('2026-02-01')).toBe('1 Şubat 2026 Pazar');
    expect(formatSessionDate('2026-08-29')).toBe('29 Ağustos 2026 Cumartesi');
  });

  it('accepts timestamps by reading only the date part', () => {
    expect(formatSessionDate('2026-12-31T23:59:00+03:00')).toBe('31 Aralık 2026 Perşembe');
  });

  it('returns invalid input unchanged', () => {
    expect(formatSessionDate('yarın')).toBe('yarın');
  });
});

describe('formatShortDate', () => {
  it('omits the weekday', () => {
    expect(formatShortDate('2026-05-19')).toBe('19 Mayıs 2026');
  });
});

describe('addDays', () => {
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('todayIso', () => {
  it('uses the local calendar day', () => {
    expect(todayIso(new Date(2026, 9, 6, 23, 30))).toBe('2026-10-06');
    expect(todayIso(new Date(2026, 0, 2, 0, 5))).toBe('2026-01-02');
  });
});

describe('relativeDayLabel', () => {
  it('names today, yesterday and tomorrow', () => {
    expect(relativeDayLabel('2026-10-06', '2026-10-06')).toBe('Bugün');
    expect(relativeDayLabel('2026-10-05', '2026-10-06')).toBe('Dün');
    expect(relativeDayLabel('2026-10-07', '2026-10-06')).toBe('Yarın');
    expect(relativeDayLabel('2026-10-01', '2026-10-06')).toBeNull();
  });
});
