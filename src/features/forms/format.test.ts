import type { FormRow } from '@/types/database';

import { classLabel, formatSessionDate, groupFormsByClass, sameTitle } from './format';

describe('formatSessionDate', () => {
  const today = new Date(2026, 9, 6);

  it('uses relative words for today and yesterday', () => {
    expect(formatSessionDate('2026-10-06', today)).toBe('Bugün');
    expect(formatSessionDate('2026-10-05', today)).toBe('Dün');
  });

  it('uses Turkish month names, adding the year only when different', () => {
    expect(formatSessionDate('2026-02-14', today)).toBe('14 Şubat');
    expect(formatSessionDate('2025-12-01', today)).toBe('1 Aralık 2025');
  });

  it('returns null for missing or malformed values', () => {
    expect(formatSessionDate(null, today)).toBeNull();
    expect(formatSessionDate('dün', today)).toBeNull();
  });
});

describe('classLabel', () => {
  it('prefers the class name, falls back to grade/section', () => {
    expect(classLabel({ name: '5/B', grade: '5', section: 'B' })).toBe('5/B');
    expect(classLabel({ name: ' ', grade: '6', section: 'A' })).toBe('6/A');
  });
});

describe('groupFormsByClass', () => {
  const form = (id: string, classId: string): FormRow => ({
    id,
    class_id: classId,
    title: id,
    subject: null,
    description: null,
    options: [],
    archived: false,
    sort_order: 0,
    created_at: '',
    teacher_id: 't',
  });

  it('groups by class and sorts classes naturally', () => {
    const groups = groupFormsByClass([
      { ...form('f1', 'c10'), classInfo: { id: 'c10', name: '10/A', grade: null, section: null } },
      { ...form('f2', 'c5'), classInfo: { id: 'c5', name: '5/B', grade: null, section: null } },
      { ...form('f3', 'c10'), classInfo: { id: 'c10', name: '10/A', grade: null, section: null } },
    ]);
    expect(groups.map((g) => g.classInfo.name)).toEqual(['5/B', '10/A']);
    expect(groups[1]?.forms.map((f) => f.id)).toEqual(['f1', 'f3']);
    expect(groups[1]?.forms[0]).not.toHaveProperty('classInfo');
  });
});

describe('sameTitle', () => {
  it('compares with Turkish casing and trimming', () => {
    expect(sameTitle(' YOKLAMA', 'yoklama')).toBe(true);
    expect(sameTitle('İzin', 'izin')).toBe(true);
    expect(sameTitle('Sözlü', 'Yoklama')).toBe(false);
  });
});
