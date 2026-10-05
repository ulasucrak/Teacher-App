import { supabase } from '@/lib/supabase';

import { apiMessages, fetchImportContext, insertStudents } from './api';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as jest.Mock;

/** Zincirlenebilir, sonunda `result` ile çözülen sahte sorgu. */
function query(result: unknown) {
  const q: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const m of ['select', 'eq', 'order', 'insert']) q[m] = jest.fn(() => q);
  q.maybeSingle = jest.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

beforeEach(() => jest.clearAllMocks());

describe('fetchImportContext', () => {
  it('sınıfı ve öğrencilerini döner', async () => {
    const classQ = query({ data: { id: 'c1', name: '5/B' }, error: null });
    const studentQ = query({ data: [{ id: 's1', full_name: 'Ali Veli', number: '7' }], error: null });
    from.mockImplementation((table: string) => (table === 'classes' ? classQ : studentQ));

    const ctx = await fetchImportContext('c1');
    expect(ctx.classRow.name).toBe('5/B');
    expect(ctx.students).toHaveLength(1);
    expect(studentQ.eq).toHaveBeenCalledWith('class_id', 'c1');
  });

  it('sınıf yoksa açıklayıcı hata verir', async () => {
    from.mockImplementation((table: string) =>
      table === 'classes' ? query({ data: null, error: null }) : query({ data: [], error: null }),
    );
    await expect(fetchImportContext('x')).rejects.toThrow(apiMessages.classNotFound);
  });

  it('ağ hatasını bağlantı mesajına çevirir', async () => {
    from.mockImplementation(() => query({ data: null, error: { message: 'TypeError: Network request failed' } }));
    await expect(fetchImportContext('c1')).rejects.toThrow(apiMessages.network);
  });
});

describe('insertStudents', () => {
  it('teacher_id göndermeden toplu ekler', async () => {
    const q = query({ data: [{ id: '1' }, { id: '2' }], error: null });
    from.mockReturnValue(q);
    const count = await insertStudents('c1', [
      { fullName: 'Ali Veli', number: '7' },
      { fullName: 'Can Su', number: null },
    ]);
    expect(count).toBe(2);
    expect(from).toHaveBeenCalledWith('students');
    expect(q.insert).toHaveBeenCalledWith([
      { class_id: 'c1', full_name: 'Ali Veli', number: '7' },
      { class_id: 'c1', full_name: 'Can Su', number: null },
    ]);
  });

  it('boş listede istek atmaz', async () => {
    await expect(insertStudents('c1', [])).resolves.toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it('veritabanı hatasında kaydetme mesajı verir', async () => {
    from.mockReturnValue(query({ data: null, error: { code: '23514', message: 'check violation' } }));
    await expect(insertStudents('c1', [{ fullName: 'Ali Veli', number: null }])).rejects.toThrow(apiMessages.saveFailed);
  });
});
