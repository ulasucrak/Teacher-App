import {
  addMark,
  getFormSummary,
  getStudentCounts,
  listHistory,
  listMarks,
  removeMark,
  undoLastMark,
} from './api';
import { HistoryApiError } from './errors';

type Result = { data: unknown; error: unknown };

const mockCalls: { method: string; args: unknown[] }[] = [];
/** Sırayla dönecek sorgu sonuçları (her `await` bir tane tüketir). */
const mockResults: Result[] = [];

function mockBuilder(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (resolve: (r: Result) => unknown) => resolve(mockResults.shift() ?? { data: null, error: null });
        }
        return (...args: unknown[]) => {
          mockCalls.push({ method: prop, args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      mockCalls.push({ method: 'from', args: [table] });
      return mockBuilder();
    },
    rpc: (fn: string, args: unknown) => {
      mockCalls.push({ method: 'rpc', args: [fn, args] });
      return mockBuilder();
    },
  },
}));

const mark = {
  id: 'm1',
  form_id: 'f1',
  student_id: 's1',
  teacher_id: 't',
  option_key: 'arti',
  note: null,
  mark_date: '2026-10-06',
  marked_at: '2026-10-06T07:32:00.123456+00:00',
  created_at: '2026-10-06T07:32:00.123456+00:00',
};

function call(method: string) {
  return mockCalls.find((c) => c.method === method);
}

function historyRow(id: number, kind = 'mark_added') {
  return {
    id,
    kind,
    student_id: 's1',
    student_name: 'Ali Yılmaz',
    student_number: '12',
    event_date: '2026-10-06',
    occurred_at: `2026-10-06T07:${String(id).padStart(2, '0')}:00.123456+00:00`,
    old_option_key: null,
    new_option_key: 'arti',
    old_note: null,
    new_note: null,
    mark_id: `m${id}`,
    undone: false,
  };
}

beforeEach(() => {
  mockCalls.length = 0;
  mockResults.length = 0;
});

describe('marks', () => {
  it('adds a mark with a trimmed note', async () => {
    mockResults.push({ data: mark, error: null });
    await expect(
      addMark({ formId: 'f1', studentId: 's1', optionKey: 'arti', markDate: '2026-10-06', note: '  ' }),
    ).resolves.toEqual(mark);
    expect(call('from')?.args).toEqual(['form_marks']);
    expect(call('insert')?.args[0]).toEqual({
      form_id: 'f1',
      student_id: 's1',
      option_key: 'arti',
      mark_date: '2026-10-06',
      note: null,
    });
  });

  it('maps database codes to Turkish messages', async () => {
    mockResults.push({ data: null, error: { message: 'option "x" is not defined', code: 'TA004' } });
    const error = await addMark({ formId: 'f1', studentId: 's1', optionKey: 'x', markDate: '2026-10-06' }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(HistoryApiError);
    expect((error as HistoryApiError).message).toBe('Bu seçenek formda artık yok. Formu yeniden açıp tekrar deneyin.');
    expect((error as HistoryApiError).code).toBe('TA004');
  });

  it('reports network failures plainly', async () => {
    mockResults.push({ data: null, error: { message: 'TypeError: Network request failed' } });
    await expect(addMark({ formId: 'f1', studentId: 's1', optionKey: 'arti', markDate: '2026-10-06' })).rejects.toThrow(
      'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
    );
  });

  it('removes a mark by id (null when already gone)', async () => {
    mockResults.push({ data: [mark], error: null });
    await expect(removeMark('m1')).resolves.toEqual(mark);
    expect(call('eq')?.args).toEqual(['id', 'm1']);
    mockResults.push({ data: [], error: null });
    await expect(removeMark('m1')).resolves.toBeNull();
  });

  it('undoes the last mark through the RPC, omitting empty filters', async () => {
    mockResults.push({ data: [mark], error: null });
    await expect(undoLastMark({ formId: 'f1', studentId: 's1', markDate: '2026-10-06', optionKey: null })).resolves.toEqual(
      mark,
    );
    expect(call('rpc')?.args).toEqual(['undo_last_mark', { p_form_id: 'f1', p_student_id: 's1', p_mark_date: '2026-10-06' }]);
    mockResults.push({ data: [], error: null });
    await expect(undoLastMark({ formId: 'f1', studentId: 's1' })).resolves.toBeNull();
  });

  it('lists marks of a day', async () => {
    mockResults.push({ data: [mark], error: null });
    await expect(listMarks('f1', { date: '2026-10-06', studentId: 's1' })).resolves.toEqual([mark]);
    expect(mockCalls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([
      ['form_id', 'f1'],
      ['mark_date', '2026-10-06'],
      ['student_id', 's1'],
    ]);
  });
});

describe('counts and summary', () => {
  const rows = [
    { student_id: 's1', full_name: 'Ali', number: '1', counts: { arti: 5, eksi: 2 }, day_counts: { arti: 1 } },
    { student_id: 's2', full_name: 'Ayşe', number: null, counts: {}, day_counts: {} },
  ];

  it("returns each student's day and total counts", async () => {
    mockResults.push({ data: rows, error: null });
    await expect(getStudentCounts('f1', '2026-10-06')).resolves.toEqual({
      s1: { day: { arti: 1 }, total: { arti: 5, eksi: 2 } },
      s2: { day: {}, total: {} },
    });
    expect(call('rpc')?.args).toEqual(['form_tally', { p_form_id: 'f1', p_day: '2026-10-06' }]);
  });

  it('summarizes a date range with net', async () => {
    mockResults.push({ data: rows, error: null });
    const summary = await getFormSummary(
      {
        id: 'f1',
        options: [
          { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
          { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
        ],
      },
      { from: '2026-10-01', to: '2026-10-07' },
    );
    expect(call('rpc')?.args).toEqual(['form_tally', { p_form_id: 'f1', p_from: '2026-10-01', p_to: '2026-10-07' }]);
    expect(summary.students.map((s) => [s.fullName, s.net])).toEqual([
      ['Ali', 3],
      ['Ayşe', 0],
    ]);
    expect(summary.net).toBe(3);
  });

  it('throws a Turkish message when the summary fails', async () => {
    mockResults.push({ data: null, error: { message: 'boom', code: 'XX000' } });
    await expect(getFormSummary({ id: 'f1', options: [] })).rejects.toThrow('Özet yüklenemedi. Tekrar deneyin.');
  });
});

describe('listHistory', () => {
  it('asks for one extra row and returns a cursor when there is more', async () => {
    mockResults.push({ data: [historyRow(3), historyRow(2), historyRow(1)], error: null });
    const page = await listHistory('f1', { limit: 2, range: { from: '2026-10-01', to: null }, studentId: 's1' });
    expect(call('rpc')?.args).toEqual([
      'form_history',
      { p_form_id: 'f1', p_from: '2026-10-01', p_student_id: 's1', p_limit: 3 },
    ]);
    expect(page.events.map((e) => e.id)).toEqual([3, 2]);
    expect(page.events[0]).toMatchObject({ kind: 'mark_added', studentName: 'Ali Yılmaz', markId: 'm3', undone: false });
    // İmleç sunucudaki zaman damgasını olduğu gibi taşır (mikrosaniye kaybolmaz).
    expect(page.nextCursor).toEqual({ occurredAt: '2026-10-06T07:02:00.123456+00:00', id: 2 });
  });

  it('passes the cursor and ends when no extra row comes back', async () => {
    mockResults.push({ data: [historyRow(1)], error: null });
    const page = await listHistory('f1', { cursor: { occurredAt: 'T', id: 2 } });
    expect(call('rpc')?.args).toEqual([
      'form_history',
      { p_form_id: 'f1', p_before_occurred_at: 'T', p_before_id: 2, p_limit: 51 },
    ]);
    expect(page.nextCursor).toBeNull();
  });

  it('skips unknown event kinds', async () => {
    mockResults.push({ data: [historyRow(2, 'something_new'), historyRow(1)], error: null });
    const page = await listHistory('f1');
    expect(page.events.map((e) => e.id)).toEqual([1]);
  });
});
