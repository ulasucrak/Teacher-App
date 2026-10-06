import type { FormOption } from '@/types/database';

import { describeEvent, eventLocalDay, formatEventClock, formatEventTime, groupEventsByDay, optionLabel } from './format';
import type { HistoryEvent } from './types';

const options: FormOption[] = [
  { key: 'var', label: 'Var', tone: 'positive' },
  { key: 'yok', label: 'Yok', tone: 'negative' },
];
const plusMinus: FormOption[] = [
  { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
  { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
];

/** Cihazın yerel saatinde bir an (testler saat diliminden bağımsız kalsın). */
function local(y: number, m: number, d: number, h = 10, min = 32): string {
  return new Date(y, m - 1, d, h, min).toISOString();
}

const NOW = new Date(2026, 9, 6, 12, 0);

function event(overrides: Partial<HistoryEvent> = {}): HistoryEvent {
  return {
    id: 1,
    kind: 'entry_updated',
    studentId: 's1',
    studentName: 'Ali Yılmaz',
    studentNumber: '12',
    eventDate: '2026-10-06',
    occurredAt: local(2026, 10, 6),
    oldOptionKey: null,
    newOptionKey: null,
    oldNote: null,
    newNote: null,
    markId: null,
    undone: false,
    ...overrides,
  };
}

describe('formatEventTime', () => {
  it('uses the local clock with a short month', () => {
    expect(formatEventTime(local(2026, 10, 6, 10, 32), NOW)).toBe('6 Eki 10:32');
    expect(formatEventTime(local(2026, 2, 1, 8, 5), NOW)).toBe('1 Şub 08:05');
  });

  it('adds the year for other years', () => {
    expect(formatEventTime(local(2025, 12, 31, 23, 59), NOW)).toBe('31 Ara 2025 23:59');
  });

  it('returns invalid input unchanged', () => {
    expect(formatEventTime('dün', NOW)).toBe('dün');
    expect(eventLocalDay('dün')).toBeNull();
  });

  it('reads the local day of an instant', () => {
    expect(eventLocalDay(local(2026, 10, 6, 0, 5))).toBe('2026-10-06');
    expect(eventLocalDay(local(2026, 10, 6, 23, 55))).toBe('2026-10-06');
  });
});

describe('describeEvent (daily)', () => {
  it('writes an option change as "Var → Yok"', () => {
    const text = describeEvent(event({ oldOptionKey: 'var', newOptionKey: 'yok' }), options, NOW);
    expect(text.change).toBe('Var → Yok');
    expect(text.line).toBe('6 Eki 10:32 · Ali Yılmaz: Var → Yok');
    expect(text.detail).toBeNull();
    expect(text.dayNote).toBeNull();
    expect(text.accessibilityLabel).toBe('Ali Yılmaz: Var, Yok olarak değiştirildi. 6 Ekim 10:32.');
  });

  it('writes first marking and removal', () => {
    expect(describeEvent(event({ kind: 'entry_created', newOptionKey: 'var' }), options, NOW).change).toBe(
      'Var işaretlendi',
    );
    expect(describeEvent(event({ oldOptionKey: 'var' }), options, NOW).change).toBe('Var kaldırıldı');
    expect(describeEvent(event({ kind: 'entry_deleted', oldOptionKey: 'yok', oldNote: 'hasta' }), options, NOW)).toMatchObject({
      change: 'Yok kaldırıldı',
      detail: 'Not silindi',
    });
  });

  it('writes note-only changes as the main text', () => {
    expect(describeEvent(event({ oldOptionKey: 'var', newOptionKey: 'var', newNote: ' hasta ' }), options, NOW)).toMatchObject({
      change: 'Not eklendi: "hasta"',
      detail: null,
    });
    expect(
      describeEvent(event({ oldOptionKey: 'var', newOptionKey: 'var', oldNote: 'a', newNote: 'b' }), options, NOW).change,
    ).toBe('Not değiştirildi: "b"');
    expect(describeEvent(event({ oldNote: 'a' }), options, NOW).change).toBe('Not silindi');
  });

  it('keeps the note change as detail when the option also changed', () => {
    const text = describeEvent(event({ oldOptionKey: 'var', newOptionKey: 'yok', newNote: 'raporlu' }), options, NOW);
    expect(text.detail).toBe('Not eklendi: "raporlu"');
    expect(text.line).toBe('6 Eki 10:32 · Ali Yılmaz: Var → Yok. Not eklendi: "raporlu"');
  });

  it('shortens long notes', () => {
    const long = 'a'.repeat(100);
    const { change } = describeEvent(event({ newNote: long }), options, NOW);
    expect(change.length).toBeLessThan(80);
    expect(change.endsWith('…"')).toBe(true);
  });

  it('names removed options and notes other days', () => {
    const text = describeEvent(event({ oldOptionKey: 'eski', newOptionKey: 'var', eventDate: '2026-10-05' }), options, NOW);
    expect(text.change).toBe('Kaldırılmış seçenek → Var');
    expect(text.dayNote).toBe('5 Ekim kaydı');
    expect(text.line).toBe('6 Eki 10:32 · Ali Yılmaz: Kaldırılmış seçenek → Var (5 Ekim kaydı)');
    expect(optionLabel(null, options)).toBe('Kaldırılmış seçenek');
  });

  it('describes baseline values', () => {
    expect(describeEvent(event({ kind: 'entry_baseline', newOptionKey: 'var', newNote: 'x' }), options, NOW)).toMatchObject({
      change: 'Var olarak kayıtlı',
      detail: 'Not: "x"',
    });
    expect(describeEvent(event({ kind: 'entry_baseline', newNote: 'x' }), options, NOW).change).toBe('Not kayıtlı: "x"');
  });
});

describe('describeEvent (repeatable)', () => {
  it('writes added and undone marks', () => {
    const added = describeEvent(event({ kind: 'mark_added', newOptionKey: 'arti', undone: true }), plusMinus, NOW);
    expect(added.change).toBe('Artı eklendi');
    expect(added.undone).toBe(true);
    expect(added.accessibilityLabel).toContain('Geri alındı.');
    const removed = describeEvent(event({ kind: 'mark_removed', oldOptionKey: 'eksi', oldNote: 'konuştu' }), plusMinus, NOW);
    expect(removed.change).toBe('Eksi geri alındı');
    expect(removed.detail).toBe('Not: "konuştu"');
  });
});

describe('groupEventsByDay', () => {
  it('groups by the local day of the event, keeping order', () => {
    const groups = groupEventsByDay([
      event({ id: 3, occurredAt: local(2026, 10, 6, 9) }),
      event({ id: 2, occurredAt: local(2026, 10, 6, 8) }),
      event({ id: 1, occurredAt: local(2026, 10, 5, 15) }),
    ]);
    expect(groups.map((g) => [g.day, g.events.map((e) => e.id)])).toEqual([
      ['2026-10-06', [3, 2]],
      ['2026-10-05', [1]],
    ]);
  });
});

describe('formatEventClock', () => {
  it('writes the local clock time with leading zeros', () => {
    expect(formatEventClock(local(2026, 10, 6, 10, 32))).toBe('10:32');
    expect(formatEventClock(local(2026, 10, 6, 8, 5))).toBe('08:05');
    expect(formatEventClock('not a date')).toBe('');
  });
});
