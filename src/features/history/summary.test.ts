import type { FormOption } from '@/types/database';

import {
  REMOVED_OPTION_KEY,
  computeNet,
  countItems,
  formatCounts,
  formatNet,
  parseCounts,
  sumCounts,
  summarizeForm,
} from './summary';
import type { StudentTally } from './types';

const plusMinus: FormOption[] = [
  { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
  { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
];
const attendance: FormOption[] = [
  { key: 'var', label: 'Var', tone: 'positive' },
  { key: 'yok', label: 'Yok', tone: 'negative' },
  { key: 'izinli', label: 'İzinli', tone: 'neutral' },
];

function tally(studentId: string, counts: Record<string, number>): StudentTally {
  return { studentId, fullName: studentId, number: null, counts, dayCounts: {} };
}

describe('parseCounts', () => {
  it('keeps positive integer counts only', () => {
    expect(parseCounts({ a: 2, b: 0, c: -1, d: 1.5, e: '3', f: null })).toEqual({ a: 2, e: 3 });
    expect(parseCounts(null)).toEqual({});
    expect(parseCounts([1, 2])).toEqual({});
  });
});

describe('computeNet', () => {
  it('sums count × score', () => {
    expect(computeNet({ arti: 5, eksi: 2 }, plusMinus)).toBe(3);
    expect(computeNet({ eksi: 4 }, plusMinus)).toBe(-4);
    expect(computeNet({}, plusMinus)).toBe(0);
  });

  it('is null when no option has a score', () => {
    expect(computeNet({ var: 18, yok: 2 }, attendance)).toBeNull();
  });

  it('ignores unscored and removed options and rounds decimals', () => {
    const options: FormOption[] = [
      { key: 'a', label: 'A', tone: 'positive', score: 0.1 },
      { key: 'b', label: 'B', tone: 'neutral' },
    ];
    expect(computeNet({ a: 3, b: 10, gone: 4 }, options)).toBe(0.3);
  });
});

describe('formatNet', () => {
  it('signs the number with a real minus', () => {
    expect(formatNet(3)).toBe('+3');
    expect(formatNet(-2)).toBe('−2');
    expect(formatNet(0)).toBe('0');
    expect(formatNet(-0)).toBe('0');
    expect(formatNet(1.5)).toBe('+1,5');
    expect(formatNet(-0.25)).toBe('−0,25');
  });
});

describe('countItems / formatCounts', () => {
  it('lists non-zero counts in option order', () => {
    expect(formatCounts({ eksi: 2, arti: 5 }, plusMinus)).toBe('5 Artı, 2 Eksi');
    expect(formatCounts({ var: 18, yok: 2 }, attendance)).toBe('18 Var, 2 Yok');
  });

  it('puts removed options into one trailing item', () => {
    const items = countItems({ var: 3, eski: 1, daha_eski: 2 }, attendance);
    expect(items.map((i) => [i.key, i.count])).toEqual([
      ['var', 3],
      [REMOVED_OPTION_KEY, 3],
    ]);
    expect(formatCounts({ var: 3, eski: 1 }, attendance)).toBe('3 Var, 1 kaldırılmış seçenek');
  });

  it('can include zero counts', () => {
    expect(countItems({ var: 1 }, attendance, { includeZero: true }).map((i) => i.count)).toEqual([1, 0, 0]);
  });

  it('writes numeric labels as "label: count"', () => {
    const grades: FormOption[] = [
      { key: 'puan_5', label: '5', tone: 'positive' },
      { key: 'puan_4', label: '4', tone: 'positive' },
    ];
    expect(formatCounts({ puan_5: 2, puan_4: 1 }, grades)).toBe('5: 2, 4: 1');
  });

  it('falls back to the empty text', () => {
    expect(formatCounts({}, attendance)).toBe('Kayıt yok');
    expect(formatCounts({}, plusMinus, 'Henüz işaret yok')).toBe('Henüz işaret yok');
  });
});

describe('summarizeForm', () => {
  it('builds per-student and class totals with net for scored forms', () => {
    const summary = summarizeForm([tally('ali', { arti: 5, eksi: 2 }), tally('ayse', {})], plusMinus);
    expect(summary.scored).toBe(true);
    expect(summary.students.map((s) => [s.studentId, s.total, s.net])).toEqual([
      ['ali', 7, 3],
      ['ayse', 0, 0],
    ]);
    expect(summary.totals).toEqual({ arti: 5, eksi: 2 });
    expect(summary.net).toBe(3);
    expect(summary.items.map((i) => i.label)).toEqual(['Artı', 'Eksi']);
  });

  it('has no net for unscored forms', () => {
    const summary = summarizeForm([tally('ali', { var: 18, yok: 2 })], attendance);
    expect(summary.scored).toBe(false);
    expect(summary.net).toBeNull();
    expect(summary.students[0]?.net).toBeNull();
    expect(summary.total).toBe(20);
  });

  it('sums counts', () => {
    expect(sumCounts([{ a: 1 }, { a: 2, b: 1 }])).toEqual({ a: 3, b: 1 });
  });
});
