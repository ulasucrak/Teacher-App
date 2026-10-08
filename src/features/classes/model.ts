import type { ClassRow } from '@/types/database';

/** Sınıf + liste ekranında gösterilen sayılar. */
export interface ClassSummary extends ClassRow {
  studentCount: number;
  formCount: number;
}

/** `select('*, students(count), forms(count)')` satırının ham biçimi. */
export type ClassRowWithCounts = ClassRow & {
  students?: { count: number }[] | null;
  forms?: { count: number }[] | null;
};

export const CLASS_NAME_MAX = 40;
export const CLASS_PART_MAX = 20;

function countOf(list: { count: number }[] | null | undefined): number {
  const value = list?.[0]?.count;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function toClassSummary(row: ClassRowWithCounts): ClassSummary {
  const { students, forms, ...rest } = row;
  return { ...rest, studentCount: countOf(students), formCount: countOf(forms) };
}

const collator = new Intl.Collator('tr', { numeric: true, sensitivity: 'base' });

/** "5/A" < "5/B" < "6/A" < "10/A" (sayısal ve Türkçe sıralama). */
export function sortClasses<T extends Pick<ClassRow, 'name'>>(classes: readonly T[]): T[] {
  return [...classes].sort((a, b) => collator.compare(a.name, b.name));
}

/** Sınıf adının altındaki ayrı meta öğeleri: "5. sınıf", "B şubesi". */
export function classMetaParts(c: Pick<ClassRow, 'grade' | 'section'>): string[] {
  const parts: string[] = [];
  const grade = c.grade?.trim();
  const section = c.section?.trim();
  if (grade) parts.push(/^\d+$/.test(grade) ? `${grade}. sınıf` : grade);
  if (section) parts.push(section.length <= 2 ? `${section.toLocaleUpperCase('tr-TR')} şubesi` : section);
  return parts;
}

export interface ClassDraft {
  name: string;
  grade: string;
  section: string;
}

export interface ClassDraftErrors {
  name?: string | null;
  grade?: string | null;
  section?: string | null;
}

export interface ValidClass {
  name: string;
  grade: string | null;
  section: string | null;
}

/** Ad, düzey ve şubeden önerilen sınıf adı ("5" + "b" → "5/B"); yoksa boş. */
export function suggestClassName(grade: string, section: string): string {
  const g = grade.trim();
  const s = section.trim().toLocaleUpperCase('tr-TR');
  if (!g || !s) return '';
  return `${g}/${s}`;
}

export function validateClassDraft(
  draft: ClassDraft,
): { ok: true; value: ValidClass } | { ok: false; errors: ClassDraftErrors } {
  const errors: ClassDraftErrors = {};
  const name = draft.name.trim().replace(/\s+/g, ' ');
  const grade = draft.grade.trim();
  const section = draft.section.trim();

  if (!name) errors.name = 'Sınıf adını yazın. Örnek: 5/B';
  else if (name.length > CLASS_NAME_MAX) errors.name = `Sınıf adı en fazla ${CLASS_NAME_MAX} karakter olabilir.`;
  if (grade.length > CLASS_PART_MAX) errors.grade = `Sınıf düzeyi en fazla ${CLASS_PART_MAX} karakter olabilir.`;
  if (section.length > CLASS_PART_MAX) errors.section = `Şube en fazla ${CLASS_PART_MAX} karakter olabilir.`;

  if (errors.name || errors.grade || errors.section) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      grade: grade || null,
      section: section ? section.toLocaleUpperCase('tr-TR') : null,
    },
  };
}

/**
 * Ayrıntı girilmediyse sınıf adından düzey ve şube çıkarır: "5/B" → 5 + B, "10-A" → 10 + A,
 * "7C" → 7 + C. Tanınmayan adlarda (ör. "Matematik kulübü") ikisi de boş kalır.
 */
export function deriveClassParts(name: string): { grade: string; section: string } {
  const match = /^\s*(\d{1,2})\s*[/\-. ]?\s*(\p{L})\s*$/u.exec(name);
  if (!match) return { grade: '', section: '' };
  return { grade: match[1], section: match[2].toLocaleUpperCase('tr-TR') };
}

/** Sınıflarım altındaki selam: sabah "Günaydın", gündüz "İyi günler", akşam "İyi akşamlar". */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}
