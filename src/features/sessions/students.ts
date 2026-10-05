import type { StudentRow } from '@/types/database';

const collator = (a: string, b: string) => a.localeCompare(b, 'tr', { numeric: true, sensitivity: 'base' });

/** Okul numarasına göre (sayısal), sonra ada göre (Türkçe sıralama). Numarasızlar sonda. */
export function sortStudents<T extends Pick<StudentRow, 'number' | 'full_name'>>(students: readonly T[]): T[] {
  return [...students].sort((a, b) => {
    const an = a.number?.trim() || null;
    const bn = b.number?.trim() || null;
    if (an && bn) {
      const byNumber = collator(an, bn);
      if (byNumber !== 0) return byNumber;
    } else if (an) {
      return -1;
    } else if (bn) {
      return 1;
    }
    return collator(a.full_name, b.full_name);
  });
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
}

/** Ad (Türkçe küçük harf, kelime başı) ya da okul numarası (baştan) ile filtreler. */
export function filterStudents<T extends Pick<StudentRow, 'number' | 'full_name'>>(
  students: readonly T[],
  query: string,
): readonly T[] {
  const q = normalize(query);
  if (!q) return students;
  return students.filter((s) => {
    if (s.number && s.number.trim().startsWith(q)) return true;
    return normalize(s.full_name).includes(q);
  });
}
