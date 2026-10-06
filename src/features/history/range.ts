/**
 * Geçmiş ve özet için tarih aralığı. Uçlar cihazın yerel takvim günleridir ("YYYY-MM-DD") ve
 * aralığa dahildir; `null` uç açık demektir (ikisi de null → tüm zamanlar).
 * Kayıtların günü (session_date / mark_date) zaten yerel gün olarak saklandığından saat dilimi
 * dönüşümü gerekmez; "bugün" `todayIso()` ile cihazın takviminden alınır.
 */
import { addDays, formatShortDate, isIsoDate, todayIso } from '@/features/sessions/date';

export interface DateRange {
  /** Başlangıç günü (dahil) ya da null (baştan beri). */
  from: string | null;
  /** Bitiş günü (dahil) ya da null (bugüne kadar, sınırsız). */
  to: string | null;
}

/** Varsayılan dönem: tüm zamanlar. */
export const ALL_TIME: DateRange = Object.freeze({ from: null, to: null });

/** Geçersiz günleri atar, ters verilmiş uçları yer değiştirir. */
export function normalizeRange(range?: Partial<DateRange> | null): DateRange {
  const from = range?.from && isIsoDate(range.from) ? range.from : null;
  const to = range?.to && isIsoDate(range.to) ? range.to : null;
  if (from && to && from > to) return { from: to, to: from };
  return { from, to };
}

export function isAllTime(range?: Partial<DateRange> | null): boolean {
  const r = normalizeRange(range);
  return r.from === null && r.to === null;
}

/** Gün ("YYYY-MM-DD") aralıkta mı? Uçlar dahil. */
export function isInRange(day: string, range?: Partial<DateRange> | null): boolean {
  const r = normalizeRange(range);
  return (r.from === null || day >= r.from) && (r.to === null || day <= r.to);
}

/** getUTCDay() sırası: 0 = Pazar. */
function weekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/** Bu hafta: pazartesiden pazara. */
export function weekRange(today: string = todayIso()): DateRange {
  const from = addDays(today, -((weekday(today) + 6) % 7));
  return { from, to: addDays(from, 6) };
}

/** Bu ay: ayın ilk gününden son gününe. */
export function monthRange(today: string = todayIso()): DateRange {
  const from = `${today.slice(0, 8)}01`;
  // Ayın 1'inden 31 gün sonrası her zaman sonraki aydadır.
  const nextMonth = `${addDays(from, 31).slice(0, 8)}01`;
  return { from, to: addDays(nextMonth, -1) };
}

/** Son `days` gün, bugün dahil (ör. 30 → bugün ve önceki 29 gün). */
export function lastDaysRange(days: number, today: string = todayIso()): DateRange {
  const n = Math.max(1, Math.floor(days));
  return { from: addDays(today, -(n - 1)), to: today };
}

export type RangePresetId = 'all' | 'week' | 'month' | 'last30';

/** Dönem seçicisinin hazır seçenekleri, görünecek sırayla. */
export const RANGE_PRESETS: readonly { id: RangePresetId; label: string }[] = [
  { id: 'all', label: 'Tüm zamanlar' },
  { id: 'week', label: 'Bu hafta' },
  { id: 'month', label: 'Bu ay' },
  { id: 'last30', label: 'Son 30 gün' },
];

export function rangeForPreset(id: RangePresetId, today: string = todayIso()): DateRange {
  switch (id) {
    case 'all':
      return ALL_TIME;
    case 'week':
      return weekRange(today);
    case 'month':
      return monthRange(today);
    case 'last30':
      return lastDaysRange(30, today);
  }
}

/** Aralık bir hazır seçeneğe denk geliyorsa onun kimliği (seçili çip için), değilse null. */
export function matchRangePreset(range: Partial<DateRange> | null | undefined, today: string = todayIso()): RangePresetId | null {
  const r = normalizeRange(range);
  const found = RANGE_PRESETS.find(({ id }) => {
    const p = rangeForPreset(id, today);
    return p.from === r.from && p.to === r.to;
  });
  return found?.id ?? null;
}

/** "6 Ekim 2026" → ["6", "Ekim", "2026"] */
function dateParts(iso: string): [string, string, string] {
  const [d = '', m = '', y = ''] = formatShortDate(iso).split(' ');
  return [d, m, y];
}

/**
 * Aralığın okunur adı: "Tüm zamanlar", "6 Ekim 2026", "1 – 7 Ekim 2026",
 * "28 Eylül – 4 Ekim 2026", "1 Eylül 2026 ve sonrası", "6 Ekim 2026 ve öncesi".
 */
export function formatRange(range?: Partial<DateRange> | null): string {
  const { from, to } = normalizeRange(range);
  if (from && to) {
    if (from === to) return formatShortDate(from);
    const [fd, fm, fy] = dateParts(from);
    const [td, tm, ty] = dateParts(to);
    if (fy !== ty) return `${formatShortDate(from)} – ${formatShortDate(to)}`;
    if (fm !== tm) return `${fd} ${fm} – ${td} ${tm} ${ty}`;
    return `${fd} – ${td} ${tm} ${ty}`;
  }
  if (from) return `${formatShortDate(from)} ve sonrası`;
  if (to) return `${formatShortDate(to)} ve öncesi`;
  return 'Tüm zamanlar';
}

/** RPC argümanları: açık uçlar gönderilmez (veritabanında varsayılan null). */
export function rangeToRpcArgs(range?: Partial<DateRange> | null): { p_from?: string; p_to?: string } {
  const { from, to } = normalizeRange(range);
  return { ...(from ? { p_from: from } : {}), ...(to ? { p_to: to } : {}) };
}
