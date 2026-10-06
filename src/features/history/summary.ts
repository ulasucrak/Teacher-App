/**
 * Özet / birikim hesapları (saf). Sayılar veritabanından (form_tally) gelir:
 * günlük formda aralıktaki günlerin kayıtlı değerleri, birikimli formda geri alınmamış işaretler.
 * Net yalnızca formda en az bir puanlı seçenek varsa hesaplanır: Σ adet × puan.
 */
import { hasScores, isScore } from '@/features/forms/options';
import type { FormOption, FormOptionTone } from '@/types/database';

import type { OptionCounts, StudentTally } from './types';

/** Formdan kaldırılmış seçeneklerin toplandığı satırın anahtarı ve adı. */
export const REMOVED_OPTION_KEY = '__removed__';
export const REMOVED_OPTION_LABEL = 'Kaldırılmış seçenek';

export interface CountItem {
  /** Seçenek anahtarı; kaldırılmış seçeneklerin toplamında REMOVED_OPTION_KEY. */
  key: string;
  label: string;
  /** Kaldırılmış seçeneklerde null. */
  tone: FormOptionTone | null;
  count: number;
  /** Seçeneğin puanı; puansızsa null. */
  score: number | null;
}

export interface StudentSummary {
  studentId: string;
  fullName: string;
  number: string | null;
  counts: OptionCounts;
  /** Formdaki sırayla sıfır olmayan sayılar; en sonda varsa kaldırılmış seçenekler. */
  items: CountItem[];
  /** Tüm işaretlerin sayısı (kaldırılmış seçenekler dahil). */
  total: number;
  /** Net puan; formda puanlı seçenek yoksa null. */
  net: number | null;
}

export interface FormSummary {
  /** form_tally sırasıyla (ada göre); sınıftaki her öğrenci, kaydı olmasa da. */
  students: StudentSummary[];
  /** Sınıf toplamı. */
  totals: OptionCounts;
  items: CountItem[];
  total: number;
  net: number | null;
  /** Formda puanlı seçenek var mı (net gösterilsin mi)? */
  scored: boolean;
}

/** Ham jsonb sayı nesnesini güvenle okur: yalnızca pozitif tam sayılar kalır. */
export function parseCounts(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [key, n] of Object.entries(value as Record<string, unknown>)) {
    const count = typeof n === 'string' ? Number(n) : n;
    if (typeof count === 'number' && Number.isInteger(count) && count > 0) out[key] = count;
  }
  return out;
}

export function sumCounts(list: readonly OptionCounts[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const counts of list) {
    for (const [key, n] of Object.entries(counts)) out[key] = (out[key] ?? 0) + n;
  }
  return out;
}

export function totalCount(counts: OptionCounts): number {
  let total = 0;
  for (const n of Object.values(counts)) total += n;
  return total;
}

/** Ondalık puanlarda kayan nokta artığını temizler (0.1 + 0.2 → 0.3); −0 → 0. */
function roundScore(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

/** Σ adet × puan. Formda puanlı seçenek yoksa null; kaldırılmış seçenekler sayılmaz. */
export function computeNet(counts: OptionCounts, options: readonly FormOption[]): number | null {
  if (!hasScores(options)) return null;
  let net = 0;
  for (const o of options) {
    if (isScore(o.score)) net += (counts[o.key] ?? 0) * o.score;
  }
  return roundScore(net);
}

/**
 * Sayıları formdaki seçenek sırasıyla listeler. Formda olmayan anahtarlar tek bir
 * "Kaldırılmış seçenek" satırında toplanır. `includeZero`: sıfır olan seçenekler de gelir.
 */
export function countItems(
  counts: OptionCounts,
  options: readonly FormOption[],
  { includeZero = false }: { includeZero?: boolean } = {},
): CountItem[] {
  const items: CountItem[] = [];
  const known = new Set<string>();
  for (const o of options) {
    known.add(o.key);
    const count = counts[o.key] ?? 0;
    if (count > 0 || includeZero) {
      items.push({ key: o.key, label: o.label, tone: o.tone, count, score: isScore(o.score) ? o.score : null });
    }
  }
  let removed = 0;
  for (const [key, n] of Object.entries(counts)) if (!known.has(key)) removed += n;
  if (removed > 0) {
    items.push({ key: REMOVED_OPTION_KEY, label: REMOVED_OPTION_LABEL, tone: null, count: removed, score: null });
  }
  return items;
}

/** "5 Artı" / sayıyla başlayan etikette "5: 2" (sözlü notu gibi) / "1 kaldırılmış seçenek". */
function countText(item: CountItem): string {
  if (item.key === REMOVED_OPTION_KEY) return `${item.count} ${REMOVED_OPTION_LABEL.toLocaleLowerCase('tr-TR')}`;
  if (/^\d/.test(item.label)) return `${item.label}: ${item.count}`;
  return `${item.count} ${item.label}`;
}

/** "5 Artı, 2 Eksi" · "18 Geldi, 2 Gelmedi". Hiç sayı yoksa `empty`. */
export function formatCounts(counts: OptionCounts, options: readonly FormOption[], empty = 'Kayıt yok'): string {
  const items = countItems(counts, options);
  return items.length > 0 ? items.map(countText).join(', ') : empty;
}

/** Net puan: "+3", "−2" (eksi işareti U+2212), "0", ondalıkta "+1,5". */
export function formatNet(net: number): string {
  const rounded = roundScore(net);
  if (rounded === 0) return '0';
  const abs = Math.abs(rounded);
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/0+$/, '').replace('.', ',');
  return `${rounded > 0 ? '+' : '−'}${text}`;
}

export function summarizeStudent(tally: StudentTally, options: readonly FormOption[]): StudentSummary {
  return {
    studentId: tally.studentId,
    fullName: tally.fullName,
    number: tally.number,
    counts: tally.counts,
    items: countItems(tally.counts, options),
    total: totalCount(tally.counts),
    net: computeNet(tally.counts, options),
  };
}

export function summarizeForm(tallies: readonly StudentTally[], options: readonly FormOption[]): FormSummary {
  const totals = sumCounts(tallies.map((t) => t.counts));
  return {
    students: tallies.map((t) => summarizeStudent(t, options)),
    totals,
    items: countItems(totals, options),
    total: totalCount(totals),
    net: computeNet(totals, options),
    scored: hasScores(options),
  };
}
