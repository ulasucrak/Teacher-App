import type { StudentRow } from '@/types/database';

import { foldForSearch, normalizeStudentName } from './name';

/** Öğrenci listesinde gereken alanlar. */
export type StudentListItem = Pick<StudentRow, 'id' | 'full_name' | 'number'>;

export const STUDENT_NAME_MAX = 80;
export const STUDENT_NUMBER_MAX = 8;

const collator = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });

function hasNumber(value: string | null): value is string {
  return value !== null && value.trim() !== '';
}

/**
 * Sınıf defteri sırası: önce okul numarası (sayısal), numarası olmayanlar en sonda;
 * eşitlikte ad (Türkçe sıralama).
 */
export function compareStudents(a: StudentListItem, b: StudentListItem): number {
  const aHas = hasNumber(a.number);
  const bHas = hasNumber(b.number);
  if (aHas && bHas) {
    const byNumber = a.number!.trim().localeCompare(b.number!.trim(), 'tr', { numeric: true });
    if (byNumber !== 0) return byNumber;
  } else if (aHas !== bHas) {
    return aHas ? -1 : 1;
  }
  return collator.compare(a.full_name, b.full_name);
}

export function sortStudents<T extends StudentListItem>(students: readonly T[]): T[] {
  return [...students].sort(compareStudents);
}

/** Ad (Türkçe harf/aksan duyarsız) ya da okul numarası başlangıcıyla süzer. */
export function filterStudents<T extends StudentListItem>(students: readonly T[], query: string): T[] {
  const q = foldForSearch(query);
  if (!q) return [...students];
  return students.filter((s) => {
    if (s.number && s.number.trim().startsWith(q)) return true;
    return foldForSearch(s.full_name).includes(q);
  });
}

export interface StudentDraft {
  fullName: string;
  number: string;
}

export interface StudentDraftErrors {
  fullName?: string | null;
  number?: string | null;
}

export interface ValidStudent {
  full_name: string;
  number: string | null;
}

/**
 * Elle eklenen/düzenlenen öğrenciyi doğrular ve kaydedilecek biçime getirir.
 * `others`: aynı sınıftaki diğer öğrenciler (numara çakışması için; düzenlenen öğrenci hariç).
 */
export function validateStudentDraft(
  draft: StudentDraft,
  others: readonly StudentListItem[],
): { ok: true; value: ValidStudent } | { ok: false; errors: StudentDraftErrors } {
  const errors: StudentDraftErrors = {};
  const fullName = normalizeStudentName(draft.fullName);
  const number = draft.number.trim();

  if (!fullName) {
    errors.fullName = 'Öğrencinin adını ve soyadını yazın.';
  } else if (fullName.length > STUDENT_NAME_MAX) {
    errors.fullName = `Ad en fazla ${STUDENT_NAME_MAX} karakter olabilir. Kısaltıp tekrar deneyin.`;
  }

  if (number) {
    if (!/^\d+$/.test(number)) {
      errors.number = 'Okul numarası yalnızca rakamlardan oluşmalı. Örnek: 128';
    } else if (number.length > STUDENT_NUMBER_MAX) {
      errors.number = `Okul numarası en fazla ${STUDENT_NUMBER_MAX} haneli olabilir.`;
    } else {
      const clash = others.find((s) => s.number?.trim() === number);
      if (clash) errors.number = `${number} numarası ${clash.full_name} adına kayıtlı. Numarayı kontrol edin.`;
    }
  }

  if (errors.fullName || errors.number) return { ok: false, errors };
  return { ok: true, value: { full_name: fullName, number: number || null } };
}
