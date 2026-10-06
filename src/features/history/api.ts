/**
 * Birikimli işaretler (form_marks), özet sayıları (form_tally) ve geçmiş (form_history).
 * Geçmişi veritabanı tetikleyicileri yazar; istemci yalnızca okur.
 * RLS: teacher_id veritabanında auth.uid() ile dolar; asla gönderilmez.
 */
import { normalizeNote } from '@/features/sessions/draft';
import { supabase } from '@/lib/supabase';
import type { Database, FormEventKind, FormMarkRow, FormRow } from '@/types/database';

import { HistoryApiError } from './errors';
import { ALL_TIME, normalizeRange, rangeToRpcArgs, type DateRange } from './range';
import { parseCounts, summarizeForm, type FormSummary } from './summary';
import type { HistoryCursor, HistoryEvent, HistoryPage, StudentCounts, StudentTally } from './types';

type HistoryRow = Database['public']['Functions']['form_history']['Returns'][number];
type TallyRow = Database['public']['Functions']['form_tally']['Returns'][number];

export const DEFAULT_HISTORY_PAGE_SIZE = 50;
export const MAX_HISTORY_PAGE_SIZE = 200;

// --- İşaretler (birikimli formlar) -------------------------------------------

export interface NewMark {
  formId: string;
  studentId: string;
  optionKey: string;
  /** Cihazın yerel takvim günü ("YYYY-MM-DD"), genelde `todayIso()`. */
  markDate: string;
  note?: string | null;
}

/**
 * İşaret ekler. Veritabanı formun birikimli olduğunu (TA002), öğrencinin formun sınıfında
 * olduğunu (TA003) ve seçeneğin formda bulunduğunu (TA004) denetler.
 */
export async function addMark(input: NewMark): Promise<FormMarkRow> {
  const { data, error } = await supabase
    .from('form_marks')
    .insert({
      form_id: input.formId,
      student_id: input.studentId,
      option_key: input.optionKey,
      mark_date: input.markDate,
      note: normalizeNote(input.note),
    })
    .select('*')
    .single();
  if (error) throw new HistoryApiError(error, 'mark');
  return data;
}

/** Belirli bir işareti geri alır (siler). Silinen işaret; zaten yoksa null. */
export async function removeMark(markId: string): Promise<FormMarkRow | null> {
  const { data, error } = await supabase.from('form_marks').delete().eq('id', markId).select('*');
  if (error) throw new HistoryApiError(error, 'undo');
  return data?.[0] ?? null;
}

export interface UndoMarkInput {
  formId: string;
  studentId: string;
  /** Yalnızca bu günün işaretleri (genelde bugün); verilmezse tüm günler. */
  markDate?: string | null;
  /** Yalnızca bu seçeneğin işaretleri; verilmezse herhangi biri. */
  optionKey?: string | null;
}

/** Öğrencinin en son işaretini geri alır (tek istek, atomik). Geri alınacak işaret yoksa null. */
export async function undoLastMark(input: UndoMarkInput): Promise<FormMarkRow | null> {
  const { data, error } = await supabase.rpc('undo_last_mark', {
    p_form_id: input.formId,
    p_student_id: input.studentId,
    ...(input.markDate ? { p_mark_date: input.markDate } : {}),
    ...(input.optionKey ? { p_option_key: input.optionKey } : {}),
  });
  if (error) throw new HistoryApiError(error, 'undo');
  return data?.[0] ?? null;
}

export interface MarkFilter {
  /** Tek gün ("YYYY-MM-DD"). */
  date?: string;
  /** Gün aralığı (date verilmişse yok sayılır). */
  range?: DateRange;
  studentId?: string;
}

/** Formun (geri alınmamış) işaretleri, eskiden yeniye. */
export async function listMarks(formId: string, filter: MarkFilter = {}): Promise<FormMarkRow[]> {
  let query = supabase.from('form_marks').select('*').eq('form_id', formId);
  if (filter.date) {
    query = query.eq('mark_date', filter.date);
  } else if (filter.range) {
    const { from, to } = normalizeRange(filter.range);
    if (from) query = query.gte('mark_date', from);
    if (to) query = query.lte('mark_date', to);
  }
  if (filter.studentId) query = query.eq('student_id', filter.studentId);
  const { data, error } = await query.order('marked_at', { ascending: true }).order('created_at', { ascending: true });
  if (error) throw new HistoryApiError(error, 'marks');
  return data ?? [];
}

// --- Sayılar ve özet ---------------------------------------------------------

function toTally(row: TallyRow): StudentTally {
  return {
    studentId: row.student_id,
    fullName: row.full_name,
    number: row.number,
    counts: parseCounts(row.counts),
    dayCounts: parseCounts(row.day_counts),
  };
}

export interface TallyQuery {
  /** Sayılacak dönem; varsayılan tüm zamanlar. */
  range?: DateRange;
  /** Ayrıca sayılacak tek gün (`dayCounts`). */
  day?: string | null;
}

/**
 * Öğrenci başına seçenek sayıları (sınıftaki her öğrenci, ada göre). Günlük formda aralıktaki
 * günlerin kayıtlı değerleri, birikimli formda geri alınmamış işaretler sayılır.
 */
export async function getTallies(formId: string, query: TallyQuery = {}): Promise<StudentTally[]> {
  const { data, error } = await supabase.rpc('form_tally', {
    p_form_id: formId,
    ...rangeToRpcArgs(query.range ?? ALL_TIME),
    ...(query.day ? { p_day: query.day } : {}),
  });
  if (error) throw new HistoryApiError(error, query.day ? 'counts' : 'summary');
  return (data ?? []).map(toTally);
}

/**
 * Doldurma ekranı için: öğrenci kimliği → o günün ve tüm zamanların sayıları.
 * Sınıftaki her öğrenci yer alır (sayısı yoksa boş nesneler).
 */
export async function getStudentCounts(formId: string, day: string): Promise<Record<string, StudentCounts>> {
  const tallies = await getTallies(formId, { day });
  const out: Record<string, StudentCounts> = {};
  for (const t of tallies) out[t.studentId] = { day: t.dayCounts, total: t.counts };
  return out;
}

/** Dönem özeti: öğrenci başına sayılar + (puanlı formda) net, sınıf toplamı. */
export async function getFormSummary(
  form: Pick<FormRow, 'id' | 'options'>,
  range: DateRange = ALL_TIME,
): Promise<FormSummary> {
  const tallies = await getTallies(form.id, { range });
  return summarizeForm(tallies, form.options);
}

// --- Geçmiş ------------------------------------------------------------------

const EVENT_KINDS: readonly FormEventKind[] = [
  'entry_created',
  'entry_updated',
  'entry_deleted',
  'entry_baseline',
  'mark_added',
  'mark_removed',
];

function isEventKind(value: string): value is FormEventKind {
  return (EVENT_KINDS as readonly string[]).includes(value);
}

function toEvent(row: HistoryRow & { kind: FormEventKind }): HistoryEvent {
  return {
    id: row.id,
    kind: row.kind,
    studentId: row.student_id,
    studentName: row.student_name,
    studentNumber: row.student_number,
    eventDate: row.event_date,
    occurredAt: row.occurred_at,
    oldOptionKey: row.old_option_key,
    newOptionKey: row.new_option_key,
    oldNote: row.old_note,
    newNote: row.new_note,
    markId: row.mark_id,
    undone: row.undone === true,
  };
}

export interface HistoryQuery {
  /** Olayın ait olduğu güne (kayıt tarihi / işaret günü) göre süzer; varsayılan tüm zamanlar. */
  range?: DateRange;
  /** Yalnızca bu öğrencinin olayları. */
  studentId?: string | null;
  /** Önceki sayfanın `nextCursor`'ı; ilk sayfa için verilmez. */
  cursor?: HistoryCursor | null;
  /** Sayfa boyu (1–200, varsayılan 50). */
  limit?: number;
}

/** Formun geçmişi, yeniden eskiye, sayfa sayfa (öğrenci adıyla). */
export async function listHistory(formId: string, query: HistoryQuery = {}): Promise<HistoryPage> {
  const limit = Math.min(Math.max(Math.floor(query.limit ?? DEFAULT_HISTORY_PAGE_SIZE), 1), MAX_HISTORY_PAGE_SIZE);
  const { data, error } = await supabase.rpc('form_history', {
    p_form_id: formId,
    ...rangeToRpcArgs(query.range ?? ALL_TIME),
    ...(query.studentId ? { p_student_id: query.studentId } : {}),
    ...(query.cursor ? { p_before_occurred_at: query.cursor.occurredAt, p_before_id: query.cursor.id } : {}),
    // Bir fazlası: sonraki sayfa var mı?
    p_limit: limit + 1,
  });
  if (error) throw new HistoryApiError(error, 'history');
  const rows = data ?? [];
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    events: page.filter((r): r is HistoryRow & { kind: FormEventKind } => isEventKind(r.kind)).map(toEvent),
    nextCursor: rows.length > limit && last ? { occurredAt: last.occurred_at, id: last.id } : null,
  };
}
