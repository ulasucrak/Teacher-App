import type { FormOption } from '@/types/database';

import {
  buildUpsertPayload,
  countByOption,
  draftReducer,
  getDirtyStudentIds,
  getEntry,
  getUniformOption,
  initialDraftState,
  normalizeNote,
  type DraftAction,
  type DraftState,
} from './draft';

const options: FormOption[] = [
  { key: 'done', label: 'Tamamlandı', tone: 'positive' },
  { key: 'missing', label: 'Eksik', tone: 'warning' },
  { key: 'none', label: 'Getirmedi', tone: 'negative' },
];

const run = (actions: DraftAction[], start: DraftState = initialDraftState) => actions.reduce(draftReducer, start);

const loaded = run([
  {
    type: 'load',
    entries: [
      { student_id: 'a', option_key: 'done', note: null },
      { student_id: 'b', option_key: null, note: '  Kitabı unuttu ' },
    ],
  },
]);

describe('load', () => {
  it('sets saved and draft to the same normalized entries', () => {
    expect(loaded.saved).toBe(loaded.draft);
    expect(getEntry(loaded.draft, 'b')).toEqual({ optionKey: null, note: 'Kitabı unuttu' });
    expect(getEntry(loaded.draft, 'zzz')).toEqual({ optionKey: null, note: null });
    expect(getDirtyStudentIds(loaded)).toEqual([]);
  });
});

describe('toggle and clear', () => {
  it('selects an option and marks the row dirty', () => {
    const s = run([{ type: 'toggle', studentId: 'c', optionKey: 'missing' }], loaded);
    expect(getEntry(s.draft, 'c').optionKey).toBe('missing');
    expect(getDirtyStudentIds(s)).toEqual(['c']);
  });

  it('tapping the selected option again clears it', () => {
    const s = run([{ type: 'toggle', studentId: 'a', optionKey: 'done' }], loaded);
    expect(getEntry(s.draft, 'a').optionKey).toBeNull();
    expect(getDirtyStudentIds(s)).toEqual(['a']);
  });

  it('returning to the saved value is no longer dirty', () => {
    const s = run(
      [
        { type: 'toggle', studentId: 'a', optionKey: 'missing' },
        { type: 'toggle', studentId: 'a', optionKey: 'done' },
      ],
      loaded,
    );
    expect(getDirtyStudentIds(s)).toEqual([]);
  });

  it('clear sets option to null and keeps the note', () => {
    const s = run(
      [
        { type: 'setNote', studentId: 'a', note: 'Geç geldi' },
        { type: 'clear', studentId: 'a' },
      ],
      loaded,
    );
    expect(getEntry(s.draft, 'a')).toEqual({ optionKey: null, note: 'Geç geldi' });
  });

  it('keeps object identity of untouched rows (memo friendly)', () => {
    const s = run([{ type: 'toggle', studentId: 'c', optionKey: 'done' }], loaded);
    expect(s.draft.a).toBe(loaded.draft.a);
    expect(s.draft.b).toBe(loaded.draft.b);
  });

  it('returns the same state for no-op clear', () => {
    expect(draftReducer(loaded, { type: 'clear', studentId: 'b' })).toBe(loaded);
  });
});

describe('notes', () => {
  it('normalizes blank notes to null', () => {
    expect(normalizeNote('   ')).toBeNull();
    expect(normalizeNote(undefined)).toBeNull();
    expect(normalizeNote(' x ')).toBe('x');
  });

  it('setting and removing a note is tracked', () => {
    const withNote = run([{ type: 'setNote', studentId: 'a', note: 'Aferin' }], loaded);
    expect(getDirtyStudentIds(withNote)).toEqual(['a']);
    const removed = run([{ type: 'setNote', studentId: 'b', note: '' }], loaded);
    expect(getEntry(removed.draft, 'b').note).toBeNull();
    expect(getDirtyStudentIds(removed)).toEqual(['b']);
  });
});

describe('bulk apply and undo', () => {
  const ids = ['a', 'b', 'c'];

  it('applies the option to every student and offers undo', () => {
    const s = run([{ type: 'bulkApply', studentIds: ids, optionKey: 'missing' }], loaded);
    expect(ids.map((id) => getEntry(s.draft, id).optionKey)).toEqual(['missing', 'missing', 'missing']);
    expect(getEntry(s.draft, 'b').note).toBe('Kitabı unuttu');
    expect(s.undo).toMatchObject({ optionKey: 'missing', count: 3 });
    expect(getUniformOption(s, ids)).toBe('missing');
  });

  it('undo restores the previous draft exactly', () => {
    const before = run([{ type: 'toggle', studentId: 'c', optionKey: 'none' }], loaded);
    const after = run(
      [
        { type: 'bulkApply', studentIds: ids, optionKey: 'done' },
        { type: 'undoBulk' },
      ],
      before,
    );
    expect(after.draft).toBe(before.draft);
    expect(after.undo).toBeNull();
  });

  it('counts only changed rows and is a no-op when nothing changes', () => {
    const s = run([{ type: 'bulkApply', studentIds: ['a'], optionKey: 'done' }], loaded);
    expect(s).toBe(loaded);
    const partial = run([{ type: 'bulkApply', studentIds: ids, optionKey: 'done' }], loaded);
    expect(partial.undo?.count).toBe(2);
  });

  it('bulk clear with null', () => {
    const s = run([{ type: 'bulkApply', studentIds: ids, optionKey: null }], loaded);
    expect(getEntry(s.draft, 'a').optionKey).toBeNull();
    expect(s.undo?.optionKey).toBeNull();
  });

  it('a later single edit drops the undo offer', () => {
    const s = run(
      [
        { type: 'bulkApply', studentIds: ids, optionKey: 'done' },
        { type: 'toggle', studentId: 'a', optionKey: 'none' },
      ],
      loaded,
    );
    expect(s.undo).toBeNull();
    expect(draftReducer(s, { type: 'undoBulk' })).toBe(s);
  });

  it('dismissUndo keeps the draft', () => {
    const s = run(
      [
        { type: 'bulkApply', studentIds: ids, optionKey: 'done' },
        { type: 'dismissUndo' },
      ],
      loaded,
    );
    expect(s.undo).toBeNull();
    expect(getEntry(s.draft, 'c').optionKey).toBe('done');
  });
});

describe('upsert payload and saved', () => {
  it('includes only changed rows; clearing sends option_key null', () => {
    const s = run(
      [
        { type: 'toggle', studentId: 'a', optionKey: 'done' }, // clears saved 'done'
        { type: 'toggle', studentId: 'c', optionKey: 'none' },
        { type: 'setNote', studentId: 'd', note: '' }, // no change
      ],
      loaded,
    );
    const payload = buildUpsertPayload(s, 'sess-1');
    expect(payload).toEqual([
      { session_id: 'sess-1', student_id: 'a', option_key: null, note: null },
      { session_id: 'sess-1', student_id: 'c', option_key: 'none', note: null },
    ]);
  });

  it('marking payload as saved clears dirtiness', () => {
    const s = run([{ type: 'toggle', studentId: 'c', optionKey: 'none' }], loaded);
    const payload = buildUpsertPayload(s, 'sess-1');
    const after = draftReducer(s, { type: 'saved', entries: payload });
    expect(getDirtyStudentIds(after)).toEqual([]);
  });

  it('edits made while saving stay dirty', () => {
    const s = run([{ type: 'toggle', studentId: 'c', optionKey: 'none' }], loaded);
    const payload = buildUpsertPayload(s, 'sess-1');
    const edited = draftReducer(s, { type: 'toggle', studentId: 'c', optionKey: 'done' });
    const after = draftReducer(edited, { type: 'saved', entries: payload });
    expect(getDirtyStudentIds(after)).toEqual(['c']);
  });
});

describe('countByOption and getUniformOption', () => {
  it('counts per option and empty, ignoring unknown keys', () => {
    const s = run(
      [
        { type: 'toggle', studentId: 'c', optionKey: 'done' },
        { type: 'toggle', studentId: 'd', optionKey: 'legacy' },
      ],
      loaded,
    );
    expect(countByOption(s, ['a', 'b', 'c', 'd', 'e'], options)).toEqual({
      counts: { done: 2, missing: 0, none: 0 },
      empty: 2,
    });
  });

  it('uniform option is null for mixed, empty or no students', () => {
    expect(getUniformOption(loaded, ['a', 'b'])).toBeNull();
    expect(getUniformOption(loaded, [])).toBeNull();
    expect(getUniformOption(loaded, ['b'])).toBeNull();
    expect(getUniformOption(loaded, ['a'])).toBe('done');
  });
});
