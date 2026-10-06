/**
 * Geçmiş olaylarını okunur Türkçe metne çevirir (saf).
 * Saatler cihazın yerel saatiyle yazılır. Intl kullanılmaz (bkz. sessions/date.ts).
 */
import { formatShortDate, todayIso } from '@/features/sessions/date';
import type { FormOption } from '@/types/database';

import { REMOVED_OPTION_LABEL } from './summary';
import type { HistoryEvent } from './types';

const SHORT_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] as const;
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

/** Not metni bu uzunluktan sonra "…" ile kısaltılır. */
export const NOTE_PREVIEW_LENGTH = 60;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseInstant(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timeText(iso: string, now: Date, months: readonly string[]): string {
  const date = parseInstant(iso);
  if (!date) return iso;
  const year = date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;
  return `${date.getDate()} ${months[date.getMonth()]}${year} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "6 Eki 10:32" (yerel saat); başka yıldaysa "6 Eki 2025 10:32". */
export function formatEventTime(occurredAt: string, now: Date = new Date()): string {
  return timeText(occurredAt, now, SHORT_MONTHS);
}

/** Olay anının yerel takvim günü ("YYYY-MM-DD"); geçersiz girdide null. */
export function eventLocalDay(occurredAt: string): string | null {
  const date = parseInstant(occurredAt);
  return date ? todayIso(date) : null;
}

/** Seçeneğin adı; formdan kaldırılmışsa "Kaldırılmış seçenek". */
export function optionLabel(key: string | null, options: readonly FormOption[]): string {
  return options.find((o) => o.key === key)?.label ?? REMOVED_OPTION_LABEL;
}

function quote(note: string): string {
  const flat = note.trim().replace(/\s+/g, ' ');
  const short = flat.length > NOTE_PREVIEW_LENGTH ? `${flat.slice(0, NOTE_PREVIEW_LENGTH - 1).trimEnd()}…` : flat;
  return `"${short}"`;
}

function cleanNote(note: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

interface ChangeText {
  /** Görünen metin ("Var → Yok"). */
  change: string;
  /** Ekran okuyucu metni (ok işareti yerine cümle). */
  spoken: string;
  detail: string | null;
}

function noteChange(oldNote: string | null, newNote: string | null): string | null {
  const before = cleanNote(oldNote);
  const after = cleanNote(newNote);
  if (before === after) return null;
  if (!before) return `Not eklendi: ${quote(after ?? '')}`;
  if (!after) return 'Not silindi';
  return `Not değiştirildi: ${quote(after)}`;
}

function entryChange(event: HistoryEvent, options: readonly FormOption[]): ChangeText {
  const { oldOptionKey: before, newOptionKey: after } = event;
  const note = noteChange(event.oldNote, event.newNote);
  let change: string | null = null;
  let spoken: string | null = null;
  if (before !== after) {
    if (before === null) {
      change = `${optionLabel(after, options)} işaretlendi`;
    } else if (after === null) {
      change = `${optionLabel(before, options)} kaldırıldı`;
    } else {
      const from = optionLabel(before, options);
      const to = optionLabel(after, options);
      change = `${from} → ${to}`;
      spoken = `${from}, ${to} olarak değiştirildi`;
    }
  }
  if (change) return { change, spoken: spoken ?? change, detail: note };
  const only = note ?? 'Kayıt güncellendi';
  return { change: only, spoken: only, detail: null };
}

function noteDetail(note: string | null): string | null {
  const clean = cleanNote(note);
  return clean ? `Not: ${quote(clean)}` : null;
}

/** Olayın ana metni ve (varsa) not satırı. */
export function describeChange(event: HistoryEvent, options: readonly FormOption[]): ChangeText {
  switch (event.kind) {
    case 'entry_created':
    case 'entry_updated':
    case 'entry_deleted':
      return entryChange(event, options);
    case 'entry_baseline': {
      if (event.newOptionKey !== null) {
        const change = `${optionLabel(event.newOptionKey, options)} olarak kayıtlı`;
        return { change, spoken: change, detail: noteDetail(event.newNote) };
      }
      const note = cleanNote(event.newNote);
      const change = note ? `Not kayıtlı: ${quote(note)}` : 'Kayıtlı';
      return { change, spoken: change, detail: null };
    }
    case 'mark_added': {
      const change = `${optionLabel(event.newOptionKey, options)} eklendi`;
      return { change, spoken: change, detail: noteDetail(event.newNote) };
    }
    case 'mark_removed': {
      const change = `${optionLabel(event.oldOptionKey, options)} geri alındı`;
      return { change, spoken: change, detail: noteDetail(event.oldNote) };
    }
    default: {
      const change = 'Kayıt güncellendi';
      return { change, spoken: change, detail: null };
    }
  }
}

export interface HistoryEventText {
  /** "6 Eki 10:32" (yerel saat). */
  time: string;
  student: string;
  /** Ana metin: "Var → Yok", "Var işaretlendi", "Var kaldırıldı", "Artı eklendi", "Artı geri alındı". */
  change: string;
  /** İkinci satır: not değişikliği ya da işaretin notu; yoksa null. */
  detail: string | null;
  /** Olay başka bir günün kaydını değiştirdiyse o gün: "5 Ekim kaydı"; aynı günse null. */
  dayNote: string | null;
  /** Eklenen işaret sonradan geri alındı (üstü çizili gösterilebilir). */
  undone: boolean;
  /** Tek satır: "6 Eki 10:32 · Ali Yılmaz: Var → Yok". */
  line: string;
  /** Ekran okuyucu: "Ali Yılmaz: Var, Yok olarak değiştirildi. 6 Ekim 10:32." */
  accessibilityLabel: string;
}

/** Gün etiketi, bu yıl için yılsız: "5 Ekim" / "28 Aralık 2025". */
function dayLabel(iso: string, now: Date): string {
  const text = formatShortDate(iso);
  const year = String(now.getFullYear());
  return text.endsWith(` ${year}`) ? text.slice(0, -year.length - 1) : text;
}

/** Olayı ekranda gösterilecek parçalara çevirir. */
export function describeEvent(
  event: HistoryEvent,
  options: readonly FormOption[],
  now: Date = new Date(),
): HistoryEventText {
  const { change, spoken, detail } = describeChange(event, options);
  const time = formatEventTime(event.occurredAt, now);
  const localDay = eventLocalDay(event.occurredAt);
  const dayNote = localDay && localDay !== event.eventDate ? `${dayLabel(event.eventDate, now)} kaydı` : null;
  const student = event.studentName;

  const line = [`${time} · ${student}: ${change}`, detail ? `. ${detail}` : '', dayNote ? ` (${dayNote})` : ''].join('');
  const spokenParts = [`${student}: ${spoken}.`];
  if (detail) spokenParts.push(`${detail}.`);
  if (event.undone) spokenParts.push('Geri alındı.');
  spokenParts.push(`${timeText(event.occurredAt, now, MONTHS)}.`);
  if (dayNote) spokenParts.push(`${dayNote}.`);

  return {
    time,
    student,
    change,
    detail,
    dayNote,
    undone: event.undone,
    line,
    accessibilityLabel: spokenParts.join(' '),
  };
}

export interface HistoryDayGroup {
  /** Olayların yerel günü ("YYYY-MM-DD"); başlıkta `formatDayLabel` ile yazılabilir. */
  day: string;
  events: HistoryEvent[];
}

/** Yeniden eskiye sıralı olayları, gerçekleştikleri yerel güne göre gruplar (sıra korunur). */
export function groupEventsByDay(events: readonly HistoryEvent[]): HistoryDayGroup[] {
  const groups: HistoryDayGroup[] = [];
  for (const event of events) {
    const day = eventLocalDay(event.occurredAt) ?? event.eventDate;
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else groups.push({ day, events: [event] });
  }
  return groups;
}

/** Olay anının yerel saati: "10:32". Geçersiz girdide boş metin. */
export function formatEventClock(occurredAt: string): string {
  const date = parseInstant(occurredAt);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : '';
}
