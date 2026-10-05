import { classMetaParts, sortClasses, suggestClassName, toClassSummary, validateClassDraft } from './model';

const base = { id: 'x', teacher_id: 't', created_at: '2026-01-01', grade: null, section: null };

describe('toClassSummary', () => {
  it('flattens embedded counts', () => {
    const summary = toClassSummary({ ...base, name: '5/B', students: [{ count: 32 }], forms: [{ count: 3 }] });
    expect(summary).toMatchObject({ name: '5/B', studentCount: 32, formCount: 3 });
    expect(summary).not.toHaveProperty('students');
  });

  it('defaults missing counts to 0', () => {
    expect(toClassSummary({ ...base, name: '6/A', students: [], forms: null })).toMatchObject({
      studentCount: 0,
      formCount: 0,
    });
  });
});

describe('sortClasses', () => {
  it('sorts numerically and with Turkish collation', () => {
    const names = ['10/A', '5/Ç', '5/C', '6/A', '5/B'].map((name) => ({ name }));
    expect(sortClasses(names).map((c) => c.name)).toEqual(['5/B', '5/C', '5/Ç', '6/A', '10/A']);
  });
});

describe('classMetaParts', () => {
  it('formats grade and section as separate items', () => {
    expect(classMetaParts({ grade: '5', section: 'b' })).toEqual(['5. sınıf', 'B şubesi']);
    expect(classMetaParts({ grade: 'Hazırlık', section: null })).toEqual(['Hazırlık']);
    expect(classMetaParts({ grade: null, section: 'i' })).toEqual(['İ şubesi']);
  });
});

describe('validateClassDraft', () => {
  it('requires a name', () => {
    const r = validateClassDraft({ name: '  ', grade: '', section: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.name).toMatch(/Sınıf adını/);
  });

  it('trims and uppercases section in Turkish, empty optional fields become null', () => {
    expect(validateClassDraft({ name: ' 5/ı ', grade: '', section: 'i' })).toEqual({
      ok: true,
      value: { name: '5/ı', grade: null, section: 'İ' },
    });
  });
});

describe('suggestClassName', () => {
  it('combines grade and section', () => {
    expect(suggestClassName('5', 'i')).toBe('5/İ');
    expect(suggestClassName('5', '')).toBe('');
  });
});
