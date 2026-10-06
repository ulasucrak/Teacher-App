import type { ClassRow } from '@/types/database';

import { emptyProgress, presetFormInput, runClassSetup, type SetupApi } from './setup';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const classRow: ClassRow = { id: 'c1', name: '5/B', grade: '5', section: 'B', teacher_id: 't', created_at: '' };
const input = {
  klass: { name: '5/B', grade: '5', section: 'B' },
  students: [{ full_name: 'Ayşe Yılmaz', number: '12' }],
  presets: ['yoklama', 'odev'] as const,
};

function makeApi(over: Partial<SetupApi> = {}): jest.Mocked<SetupApi> {
  return {
    createClass: jest.fn(async () => classRow),
    addStudents: jest.fn(async () => []),
    createForm: jest.fn(async () => ({})),
    ...over,
  } as jest.Mocked<SetupApi>;
}

describe('runClassSetup', () => {
  it('creates the class, students and selected forms in order', async () => {
    const api = makeApi();
    const outcome = await runClassSetup({ ...input, presets: [...input.presets] }, emptyProgress, api);
    expect(outcome.ok).toBe(true);
    expect(api.createClass).toHaveBeenCalledWith(input.klass);
    expect(api.addStudents).toHaveBeenCalledWith('c1', input.students);
    expect(api.createForm.mock.calls.map((c) => c[1].title)).toEqual(['Yoklama', 'Ödev kontrolü']);
  });

  it('skips the student insert when there are no students', async () => {
    const api = makeApi();
    await runClassSetup({ ...input, students: [], presets: [] }, emptyProgress, api);
    expect(api.addStudents).not.toHaveBeenCalled();
  });

  it('reports a class failure without progress', async () => {
    const api = makeApi({ createClass: jest.fn(async () => Promise.reject(new TypeError('Network request failed'))) });
    const outcome = await runClassSetup({ ...input, presets: [] }, emptyProgress, api);
    expect(outcome).toMatchObject({ ok: false, stage: 'class', progress: { classRow: null } });
    if (!outcome.ok) expect(outcome.message).toMatch(/Sunucuya ulaşılamadı/);
  });

  it('keeps the created class when students fail and resumes without recreating it', async () => {
    const api = makeApi({ addStudents: jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue([]) });
    const first = await runClassSetup({ ...input, presets: ['yoklama'] }, emptyProgress, api);
    expect(first).toMatchObject({ ok: false, stage: 'students' });
    if (first.ok) return;
    expect(first.message).toBe('5/B oluşturuldu ama öğrenciler eklenemedi. Tekrar deneyin.');
    expect(api.createForm).not.toHaveBeenCalled();

    const second = await runClassSetup({ ...input, presets: ['yoklama'] }, first.progress, api);
    expect(second.ok).toBe(true);
    expect(api.createClass).toHaveBeenCalledTimes(1);
    expect(api.addStudents).toHaveBeenCalledTimes(2);
    expect(api.createForm).toHaveBeenCalledTimes(1);
  });

  it('does not recreate forms that were already saved', async () => {
    const api = makeApi({
      createForm: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('x')).mockResolvedValue({}),
    });
    const first = await runClassSetup({ ...input, presets: ['yoklama', 'odev'] }, emptyProgress, api);
    expect(first).toMatchObject({ ok: false, stage: 'forms', progress: { formsSaved: ['yoklama'] } });
    if (first.ok) return;
    await runClassSetup({ ...input, presets: ['yoklama', 'odev'] }, first.progress, api);
    expect(api.createForm.mock.calls.map((c) => c[1].title)).toEqual(['Yoklama', 'Ödev kontrolü', 'Ödev kontrolü']);
  });
});

describe('presetFormInput', () => {
  it('copies preset options', () => {
    expect(presetFormInput('sozlu')).toMatchObject({ title: 'Sözlü', subject: null, description: null });
    expect(presetFormInput('sozlu')?.options).toHaveLength(5);
  });
});
