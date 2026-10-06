/**
 * Birikimli form tahtasının saf yardımcıları: öğrenci satırlarında sayı artırma/azaltma
 * (iyimser güncelleme ve geri alma bunlarla yapılır).
 */
import type { OptionCounts, StudentSummary, StudentTally } from '@/features/history';
import { sortStudents } from '@/features/sessions/students';

function bumpCounts(counts: OptionCounts, key: string, delta: number): OptionCounts {
  const next = (counts[key] ?? 0) + delta;
  const copy: Record<string, number> = { ...counts };
  if (next > 0) copy[key] = next;
  else delete copy[key];
  return copy;
}

/**
 * Öğrencinin bugünkü ve toplam sayısını `delta` kadar değiştirir (sayı 0'ın altına inmez).
 * Başka öğrenciler aynı nesne olarak kalır (satır `memo`'su bozulmaz).
 */
export function bumpTally(
  rows: readonly StudentTally[],
  studentId: string,
  optionKey: string,
  delta: number,
): StudentTally[] {
  return rows.map((row) =>
    row.studentId === studentId
      ? {
          ...row,
          counts: bumpCounts(row.counts, optionKey, delta),
          dayCounts: bumpCounts(row.dayCounts, optionKey, delta),
        }
      : row,
  );
}

export type SummarySort = 'name' | 'score';

/**
 * Özet listesini sıralar: "name" okul numarası sonra ad; "score" puanlı formda net, puansızda
 * toplam işaret sayısı çoktan aza (eşitlikte numara/ad sırası korunur).
 */
export function sortSummaryStudents(students: readonly StudentSummary[], sort: SummarySort): StudentSummary[] {
  const order = sortStudents(students.map((s, index) => ({ index, number: s.number, full_name: s.fullName })));
  const byName = order.map(({ index }) => students[index] as StudentSummary);
  if (sort === 'name') return byName;
  const value = (s: StudentSummary) => s.net ?? s.total;
  return [...byName].sort((a, b) => value(b) - value(a));
}
