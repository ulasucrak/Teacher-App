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

describe('presetFormInput with a chosen type', () => {
  it('keeps each template\'s own type by default', () => {
    expect(presetFormInput('yoklama')?.mode).toBe('daily');
    expect(presetFormInput('artieksi')?.mode).toBe('repeatable');
  });

  it('forces the type and adds suggested scores to a cumulative template', () => {
    const odev = presetFormInput('odev', 'repeatable');
    expect(odev?.mode).toBe('repeatable');
    expect(odev?.options.filter((o) => o.score !== undefined).map((o) => [o.key, o.score])).toEqual([
      ['tamamlandi', 1],
      ['getirmedi', -1],
      ['yapmadi', -1],
    ]);
    // Sayıların yeterli olduğu şablonda puan yok.
    expect(presetFormInput('yoklama', 'repeatable')?.options.some((o) => o.score !== undefined)).toBe(false);
    expect(presetFormInput('artieksi', 'daily')?.mode).toBe('daily');
  });
});

describe('runClassSetup', () => {
  it('creates the class, students and selected forms in order', async () => {
    const api = makeApi();
    const outcome = await runClassSetup({ ...input, presets: [...input.presets] }, emptyProgress, api);
    expect(outcome.ok).toBe(true);
    expect(api.createClass).toHaveBeenCalledWith(input.klass);
    expect(api.addStudents).toHaveBeenCalledWith('c1', input.students);
    expect(api.createForm.mock.calls.map((c) => c[1].title)).toEqual(['Yoklama', 'Ödev kontrolü']);
  });

  it('creates every selected form with the chosen type', async () => {
    const api = makeApi();
    await runClassSetup({ ...input, presets: [...input.presets], modeChoice: 'repeatable' }, emptyProgress, api);
    expect(api.createForm.mock.calls.map((c) => c[1].mode)).toEqual(['repeatable', 'repeatable']);
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
    expect(presetFormInput('sozlu')?.mode).toBe('daily');
    expect(presetFormInput('sozlu')?.options).toEqual([
      { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
      { key: 'yarim_arti', label: 'Yarım artı', tone: 'positive', score: 0.5 },
      { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
    ]);
  });
});
