import type { HistoryEvent, StudentTally } from '@/features/history';
import type { FormRow } from '@/types/database';

export const attendanceForm: FormRow = {
  id: 'f1',
  class_id: 'c1',
  teacher_id: 't',
  title: 'Yoklama',
  subject: null,
  description: null,
  archived: false,
  mode: 'daily',
  sort_order: 0,
  created_at: '',
  options: [
    { key: 'var', label: 'Var', tone: 'positive' },
    { key: 'yok', label: 'Yok', tone: 'negative' },
  ],
};

export const plusMinusForm: FormRow = {
  ...attendanceForm,
  id: 'f2',
  title: 'Artı / eksi',
  mode: 'repeatable',
  options: [
    { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
    { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
  ],
};

export function tally(overrides: Partial<StudentTally> & { studentId: string; fullName: string }): StudentTally {
  return { number: null, counts: {}, dayCounts: {}, ...overrides };
}

/** Cihazın yerel saatinde bir an (testler saat diliminden bağımsız kalsın). */
export function localIso(y: number, m: number, d: number, h = 10, min = 32): string {
  return new Date(y, m - 1, d, h, min).toISOString();
}

export function event(overrides: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    id: 1,
    kind: 'mark_added',
    studentId: 's1',
    studentName: 'Ali Yılmaz',
    studentNumber: '12',
    eventDate: '2026-10-06',
    occurredAt: localIso(2026, 10, 6),
    oldOptionKey: null,
    newOptionKey: 'arti',
    oldNote: null,
    newNote: null,
    markId: 'm1',
    undone: false,
    ...overrides,
  };
}
