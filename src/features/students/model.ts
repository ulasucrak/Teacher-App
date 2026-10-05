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

/** Okul numarası: harf ve rakam (örn. "128", "12A"); fotoğraftan içe aktarma da bu biçimi üretebilir. */
const NUMBER_PATTERN = /^[\p{L}\p{N}]+$/u;

/**
 * Numara çakışması anahtarı: baştaki sıfırlar ve büyük/küçük harf farkı yok sayılır
 * ("007" = "7", "12a" = "12A").
 */
export function studentNumberKey(number: string | null | undefined): string {
  const trimmed = (number ?? '').trim().toLocaleUpperCase('tr-TR');
  return trimmed.replace(/^0+(?=.)/, '');
}

/**
 * Elle eklenen/düzenlenen öğrenciyi doğrular ve kaydedilecek biçime getirir.
 * `others`: aynı sınıftaki diğer öğrenciler (numara çakışması için; düzenlenen öğrenci hariç).
 * `originalNumber`: düzenlemede kayıtlı numara; değişmediyse biçim denetimi yapılmaz.
 */
export function validateStudentDraft(
  draft: StudentDraft,
  others: readonly StudentListItem[],
  originalNumber?: string | null,
): { ok: true; value: ValidStudent } | { ok: false; errors: StudentDraftErrors } {
  const errors: StudentDraftErrors = {};
  const fullName = normalizeStudentName(draft.fullName);
  const original = (originalNumber ?? '').trim();
  const rawNumber = draft.number.trim();
  const unchanged = original !== '' && rawNumber === original;
  // Yeni/değişen numara büyük harfe çevrilir ("12a" → "12A"); değişmeyen olduğu gibi kalır.
  const number = unchanged ? rawNumber : rawNumber.toLocaleUpperCase('tr-TR');

  if (!fullName) {
    errors.fullName = 'Öğrencinin adını ve soyadını yazın.';
  } else if (fullName.length > STUDENT_NAME_MAX) {
    errors.fullName = `Ad en fazla ${STUDENT_NAME_MAX} karakter olabilir. Kısaltıp tekrar deneyin.`;
  }

  if (number) {
    if (!unchanged && !NUMBER_PATTERN.test(number)) {
      errors.number = 'Okul numarası yalnızca harf ve rakamdan oluşabilir. Örnek: 128 ya da 12A';
    } else if (!unchanged && number.length > STUDENT_NUMBER_MAX) {
      errors.number = `Okul numarası en fazla ${STUDENT_NUMBER_MAX} karakter olabilir.`;
    } else {
      const key = studentNumberKey(number);
      const clash = others.find((s) => s.number && studentNumberKey(s.number) === key);
      if (clash) errors.number = `${number} numarası ${clash.full_name} adına kayıtlı. Numarayı kontrol edin.`;
    }
  }

  if (errors.fullName || errors.number) return { ok: false, errors };
  return { ok: true, value: { full_name: fullName, number: number || null } };
}
