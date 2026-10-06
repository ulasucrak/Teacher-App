/**
 * Türkçe tarih yardımcıları. `form_sessions.session_date` bir `date` sütunudur ("YYYY-MM-DD");
 * saat dilimi kaymasını önlemek için tüm hesaplar UTC gün üzerinden yapılır.
 * Intl'e güvenmiyoruz: Hermes'te `tr` yerel verisi her derlemede bulunmayabilir.
 */

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

/** getUTCDay() sırası: 0 = Pazar. */
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] as const;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

function parse(iso: string): Date | null {
  const match = ISO_DATE.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Cihazın yerel takvimine göre bugünün tarihi ("YYYY-MM-DD"). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "2026-10-06" + 1 → "2026-10-07" (ay/yıl taşmaları dahil). */
export function addDays(iso: string, days: number): string {
  const date = parse(iso);
  if (!date) return iso;
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** "2026-10-06" → "6 Ekim 2026 Salı". Geçersiz girdi olduğu gibi döner. */
export function formatSessionDate(iso: string): string {
  const date = parse(iso);
  if (!date) return iso;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()} ${WEEKDAYS[date.getUTCDay()]}`;
}

/** Kısa biçim, gün adı olmadan: "6 Ekim 2026". */
export function formatShortDate(iso: string): string {
  const date = parse(iso);
  if (!date) return iso;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

/**
 * Liste satırları için kısa biçim: "Bugün" / "Dün" / "Yarın", bu yıl için "14 Şubat",
 * başka yıl için "1 Aralık 2025". Geçersiz girdide null.
 */
export function formatCompactDate(iso: string, today: string = todayIso()): string | null {
  const date = parse(iso);
  if (!date) return null;
  const relative = relativeDayLabel(iso, today);
  if (relative) return relative;
  const base = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  return today.startsWith(String(date.getUTCFullYear())) ? base : `${base} ${date.getUTCFullYear()}`;
}

/** Bugüne göre göreli ad: "Bugün", "Dün", "Yarın"; diğer günler için null. */
export function relativeDayLabel(iso: string, today: string = todayIso()): string | null {
  if (iso === today) return 'Bugün';
  if (iso === addDays(today, -1)) return 'Dün';
  if (iso === addDays(today, 1)) return 'Yarın';
  return null;
}

/** "2026-10-06" biçiminde geçerli bir gün mü? */
export function isIsoDate(value: string): boolean {
  const date = parse(value);
  return date !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && toIso(date) === value;
}

/**
 * Doldurma ekranının tarih etiketi: "Bugün, 6 Ekim", "Dün, 5 Ekim", "14 Şubat",
 * başka yıl için "1 Aralık 2025".
 */
export function formatDayLabel(iso: string, today: string = todayIso()): string {
  const date = parse(iso);
  if (!date) return iso;
  const base = `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  const withYear = today.startsWith(String(date.getUTCFullYear())) ? base : `${base} ${date.getUTCFullYear()}`;
  const relative = relativeDayLabel(iso, today);
  return relative ? `${relative}, ${withYear}` : withYear;
}
