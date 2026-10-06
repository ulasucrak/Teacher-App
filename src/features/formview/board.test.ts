import type { StudentSummary, StudentTally } from '@/features/history';

import { bumpTally, sortSummaryStudents } from './board';

const tally = (studentId: string, counts: Record<string, number>, dayCounts: Record<string, number>): StudentTally => ({
  studentId,
  fullName: `Öğrenci ${studentId}`,
  number: null,
  counts,
  dayCounts,
});

describe('bumpTally', () => {
  it('adds to the day and total counts of one student only', () => {
    const rows = [tally('a', { arti: 2 }, { arti: 1 }), tally('b', {}, {})];
    const next = bumpTally(rows, 'a', 'eksi', 1);

    expect(next[0]).toMatchObject({ counts: { arti: 2, eksi: 1 }, dayCounts: { arti: 1, eksi: 1 } });
    expect(next[1]).toBe(rows[1]);
    expect(rows[0]!.counts).toEqual({ arti: 2 });
  });

  it('drops a key when it reaches zero and never goes below zero', () => {
    const rows = [tally('a', { arti: 1 }, { arti: 1 })];
    const once = bumpTally(rows, 'a', 'arti', -1);
    expect(once[0]).toMatchObject({ counts: {}, dayCounts: {} });
    const twice = bumpTally(once, 'a', 'arti', -1);
    expect(twice[0]).toMatchObject({ counts: {}, dayCounts: {} });
  });
});

describe('sortSummaryStudents', () => {
  const student = (studentId: string, fullName: string, number: string | null, net: number | null, total: number): StudentSummary => ({
    studentId,
    fullName,
    number,
    counts: {},
    items: [],
    total,
    net,
  });
  const list = [
    student('c', 'Can', '9', -1, 3),
    student('a', 'Ali', '12', 4, 6),
    student('b', 'Ayşe', '3', 4, 5),
  ];

  it('sorts by school number, then name', () => {
    expect(sortSummaryStudents(list, 'name').map((s) => s.studentId)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by net, highest first, keeping the name order on ties', () => {
    expect(sortSummaryStudents(list, 'score').map((s) => s.studentId)).toEqual(['b', 'a', 'c']);
  });

  it('falls back to the mark total when the form has no scores', () => {
    const unscored = list.map((s) => ({ ...s, net: null }));
    expect(sortSummaryStudents(unscored, 'score').map((s) => s.studentId)).toEqual(['a', 'b', 'c']);
  });
});
