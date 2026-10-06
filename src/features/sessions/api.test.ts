import { createSession, ensureSessionForDate } from './api';

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
  },
}));

const row = {
  id: 's1',
  form_id: 'f1',
  session_date: '2026-10-06',
  title: null,
  status: 'published',
  teacher_id: 't',
  created_at: '',
};

beforeEach(() => {
  mockCalls.length = 0;
  mockResults.length = 0;
});

describe('ensureSessionForDate', () => {
  it('creates a new session', async () => {
    mockResults.push({ data: row, error: null });
    await expect(ensureSessionForDate({ formId: 'f1', sessionDate: '2026-10-06' })).resolves.toEqual({
      session: row,
      created: true,
    });
    expect(mockCalls.find((c) => c.method === 'insert')?.args[0]).toMatchObject({ form_id: 'f1', session_date: '2026-10-06' });
  });

  it('returns the existing session on a unique violation (23505)', async () => {
    const existing = { ...row, id: 'other' };
    mockResults.push({ data: null, error: { message: 'duplicate key', code: '23505' } });
    mockResults.push({ data: [existing], error: null });
    await expect(ensureSessionForDate({ formId: 'f1', sessionDate: '2026-10-06' })).resolves.toEqual({
      session: existing,
      created: false,
    });
  });

  it('createSession returns just the session', async () => {
    mockResults.push({ data: null, error: { message: 'duplicate key', code: '23505' } });
    mockResults.push({ data: [row], error: null });
    await expect(createSession({ formId: 'f1', sessionDate: '2026-10-06' })).resolves.toEqual(row);
  });

  it('throws a Turkish message on other errors', async () => {
    mockResults.push({ data: null, error: { message: 'boom', code: '42501' } });
    await expect(createSession({ formId: 'f1', sessionDate: '2026-10-06' })).rejects.toThrow('Kayıt oluşturulamadı. Tekrar deneyin.');
  });
});
