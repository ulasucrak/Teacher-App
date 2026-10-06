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

/**
 * İşaretleme tahtasında sunucuya gönderilmiş (ya da gönderilmekte olan) yerel değişiklik.
 * Ekranda görünen sayılar = son sunucu anlık görüntüsü + bu işlemler. Böylece yükleme sırasında
 * biten (ya da başarısız olan) bir işlem sayıyı iki kez değiştirmez.
 */
export interface PendingOp {
  key: number;
  studentId: string;
  optionKey: string;
  delta: 1 | -1;
  /** İşlemin başladığı an (mantıksal saat). */
  issuedAt: number;
  /** Sunucu onayladığı an; null → sürüyor. */
  settledAt: number | null;
}

/** Sunucu satırlarına yerel işlemleri uygular (işlem yoksa aynı dizi döner). */
export function applyOps(rows: StudentTally[], ops: readonly PendingOp[]): StudentTally[] {
  let next = rows;
  for (const op of ops) next = bumpTally(next, op.studentId, op.optionKey, op.delta);
  return next;
}

/**
 * `startedAt` anında istenmiş bir anlık görüntü gelince hangi işlemlerin üstüne uygulanmaya devam
 * edeceği: istek başlamadan önce onaylanmış işlemler görüntüde zaten var, düşer. Diğerleri kalır;
 * ama görüntüye girip girmedikleri belirsizdir → `ambiguous` (hepsi bitince yeniden yükleyin).
 */
export function reconcileOps(
  ops: readonly PendingOp[],
  startedAt: number,
): { kept: PendingOp[]; ambiguous: boolean } {
  const kept = ops.filter((op) => op.settledAt === null || op.settledAt > startedAt);
  return { kept, ambiguous: kept.length > 0 };
}

/** Bugünün bitimine (yerel gece yarısı) kalan süre (ms), en az 1 sn. */
export function msUntilNextDay(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return Math.max(1000, next.getTime() - now.getTime());
}
