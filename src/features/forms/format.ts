import type { ClassRow, FormRow } from '@/types/database';

export type ClassSummary = Pick<ClassRow, 'id' | 'name' | 'grade' | 'section'>;

/** Sınıfın listede görünen adı. `name` zaten "5/B" gibi yazılmışsa aynen kullanılır. */
export function classLabel(c: Pick<ClassRow, 'name' | 'grade' | 'section'>): string {
  const name = c.name.trim();
  if (name) return name;
  return [c.grade, c.section].filter(Boolean).join('/') || 'Adsız sınıf';
}

export interface ClassFormsGroup {
  classInfo: ClassSummary;
  forms: FormRow[];
}

/** Başka sınıfların formlarını sınıfa göre gruplar; sınıflar ada göre (Türkçe) sıralanır. */
export function groupFormsByClass(rows: readonly (FormRow & { classInfo: ClassSummary })[]): ClassFormsGroup[] {
  const map = new Map<string, ClassFormsGroup>();
  for (const { classInfo, ...form } of rows) {
    let group = map.get(classInfo.id);
    if (!group) {
      group = { classInfo, forms: [] };
      map.set(classInfo.id, group);
    }
    group.forms.push(form);
  }
  return [...map.values()].sort((a, b) =>
    classLabel(a.classInfo).localeCompare(classLabel(b.classInfo), 'tr-TR', { numeric: true }),
  );
}

/** "Yoklama", "yoklama " → aynı form sayılır (sınıfta zaten var uyarısı için). */
export function sameTitle(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR');
}

export function optionCountLabel(count: number): string {
  return `${count} seçenek`;
}
