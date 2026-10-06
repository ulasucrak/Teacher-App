/**
 * Takvim ızgarası için saf yardımcılar. Günler "YYYY-MM-DD" metnidir; hesaplar UTC gün
 * üzerinden yapıldığı için saat dilimi kaymaz. Hafta pazartesiyle başlar.
 */
import { addDays, formatShortDate } from '@/features/sessions/date';

export const WEEKDAY_HEADERS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'] as const;

export interface MonthRef {
  year: number;
  /** 1–12 */
  month: number;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function monthOf(iso: string): MonthRef {
  const [y, m] = iso.split('-').map(Number);
  return { year: y ?? 1970, month: m ?? 1 };
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** "Ekim 2026". */
export function monthTitle({ year, month }: MonthRef): string {
  const [, name = ''] = formatShortDate(`${year}-${pad(month)}-01`).split(' ');
  return `${name} ${year}`;
}

/** 0 = pazartesi … 6 = pazar. */
function mondayIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const utcDay = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return (utcDay + 6) % 7;
}

/** Ayın haftaları (pazartesi başlangıçlı); ay dışındaki hücreler null. */
export function monthGrid(ref: MonthRef): (string | null)[][] {
  const first = `${ref.year}-${pad(ref.month)}-01`;
  const next = shiftMonth(ref, 1);
  const days = Math.round(
    (Date.UTC(next.year, next.month - 1, 1) - Date.UTC(ref.year, ref.month - 1, 1)) / 86_400_000,
  );
  const cells: (string | null)[] = Array.from({ length: mondayIndex(first) }, () => null);
  for (let i = 0; i < days; i += 1) cells.push(addDays(first, i));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
