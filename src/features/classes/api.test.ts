import { createClass, listClasses } from './api';

type Result = { data: unknown; error: unknown };

const mockCalls: { method: string; args: unknown[] }[] = [];
let mockResult: Result = { data: null, error: null };

/** Zincirlenebilir, await edilebilir sahte PostgREST sorgusu. */
function mockBuilder(): unknown {
  const target: Record<string, unknown> = {};
  const proxy: unknown = new Proxy(target, {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (resolve: (r: Result) => unknown) => resolve(mockResult);
      }
      return (...args: unknown[]) => {
        mockCalls.push({ method: prop, args });
        return proxy;
      };
    },
  });
  return proxy;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (table: string) => { mockCalls.push({ method: 'from', args: [table] }); return mockBuilder(); } },
}));

beforeEach(() => {
  mockCalls.length = 0;
});

describe('classes api', () => {
  it('lists classes with embedded counts, sorted', async () => {
    mockResult = {
      data: [
        { id: '2', name: '6/A', grade: '6', section: 'A', teacher_id: 't', created_at: '', students: [{ count: 3 }], forms: [{ count: 0 }] },
        { id: '1', name: '5/B', grade: '5', section: 'B', teacher_id: 't', created_at: '', students: [{ count: 30 }], forms: [{ count: 2 }] },
      ],
      error: null,
    };
    const result = await listClasses();
    expect(mockCalls).toContainEqual({ method: 'from', args: ['classes'] });
    expect(mockCalls).toContainEqual({ method: 'select', args: ['*, students(count), forms(count)'] });
    expect(mockCalls).toContainEqual({ method: 'eq', args: ['forms.archived', false] });
    expect(result.map((c) => [c.name, c.studentCount, c.formCount])).toEqual([
      ['5/B', 30, 2],
      ['6/A', 3, 0],
    ]);
  });

  it('throws the Supabase error', async () => {
    mockResult = { data: null, error: { message: 'Network request failed' } };
    await expect(listClasses()).rejects.toEqual({ message: 'Network request failed' });
  });

  it('never sends teacher_id when creating', async () => {
    mockResult = { data: { id: 'n', name: '5/B' }, error: null };
    await createClass({ name: '5/B', grade: '5', section: 'B' });
    const insert = mockCalls.find((c) => c.method === 'insert');
    expect(insert?.args[0]).toEqual({ name: '5/B', grade: '5', section: 'B' });
  });
});
