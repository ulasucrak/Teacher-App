import type { ClassRow, FormRow } from '@/types/database';

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
] as const;

function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "2026-10-03" → "Bugün" / "Dün" / "3 Ekim" / "3 Ekim 2025". */
export function formatSessionDate(value: string | null | undefined, today: Date = new Date()): string | null {
  if (!value) return null;
  const date = parseIsoDate(value);
  if (!date) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((start.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Dün';
  const base = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

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
