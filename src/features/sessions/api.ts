/**
 * Kayıt (form_sessions) ve öğrenci girişleri (form_entries) için veri erişimi.
 * Diğer özellik klasörleri paralel yazıldığı için form/öğrenci/sınıf sorguları da burada,
 * yalnızca bu ekranların ihtiyacı kadar tutulur.
 * RLS: teacher_id veritabanında auth.uid() ile dolar; asla gönderilmez.
 */
import { supabase } from '@/lib/supabase';
import type {
  ClassRow,
  FormEntryRow,
  FormOption,
  FormRow,
  FormSessionRow,
  FormSessionStatus,
  StudentRow,
} from '@/types/database';

import type { UpsertEntry } from './draft';

interface PgError {
  message: string;
  code?: string;
}

/** Ekranlara giden hata: kullanıcıya gösterilecek Türkçe mesaj taşır. */
export class SessionsApiError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'SessionsApiError';
  }
}

const NETWORK_MESSAGE = 'İnternet bağlantısı yok. Bağlantınızı kontrol edip tekrar deneyin.';

function isNetwork(error: PgError | Error): boolean {
  return /network|fetch|timed? ?out|failed to fetch/i.test(error.message);
}

function fail(error: PgError, fallback: string): never {
  throw new SessionsApiError(isNetwork(error) ? NETWORK_MESSAGE : fallback, error);
}

/** Herhangi bir hatayı ekranda gösterilecek metne çevirir. */
export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof SessionsApiError) return error.message;
  if (error instanceof Error && isNetwork(error)) return NETWORK_MESSAGE;
  return fallback;
}

function toForm(row: Omit<FormRow, 'options'> & { options: unknown }): FormRow {
  const options = Array.isArray(row.options) ? (row.options as FormOption[]) : [];
  return { ...row, options };
}

function toSession(row: FormSessionRow | (Omit<FormSessionRow, 'status'> & { status: string })): FormSessionRow {
  return { ...row, status: row.status === 'published' ? 'published' : 'draft' };
}

// --- Form, sınıf, öğrenciler ------------------------------------------------

export async function getForm(formId: string): Promise<FormRow> {
  const { data, error } = await supabase.from('forms').select('*').eq('id', formId).maybeSingle();
  if (error) fail(error, 'Form yüklenemedi. Sayfayı yenileyip tekrar deneyin.');
  if (!data) throw new SessionsApiError('Form bulunamadı. Silinmiş olabilir; form listesine dönün.');
  return toForm(data as Omit<FormRow, 'options'> & { options: unknown });
}

export async function getClass(classId: string): Promise<ClassRow | null> {
  const { data, error } = await supabase.from('classes').select('*').eq('id', classId).maybeSingle();
  if (error) fail(error, 'Sınıf bilgisi yüklenemedi. Tekrar deneyin.');
  return (data as ClassRow | null) ?? null;
}

export async function listStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await supabase.from('students').select('*').eq('class_id', classId);
  if (error) fail(error, 'Öğrenciler yüklenemedi. Tekrar deneyin.');
  return (data as StudentRow[] | null) ?? [];
}

export async function countStudents(classId: string): Promise<number> {
  const { count, error } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId);
  if (error) fail(error, 'Öğrenci sayısı yüklenemedi. Tekrar deneyin.');
  return count ?? 0;
}

// --- Kayıtlar ---------------------------------------------------------------

export interface SessionSummary {
  session: FormSessionRow;
  /** Seçeneği işaretlenmiş öğrenci sayısı. */
  filled: number;
  /** Seçenek anahtarı → öğrenci sayısı. */
  counts: Record<string, number>;
}

type SessionWithEntries = Omit<FormSessionRow, 'status'> & {
  status: string;
  form_entries: Pick<FormEntryRow, 'option_key'>[] | null;
};

/** Bir formun kayıtları, yeniden eskiye; her biri için doluluk ve seçenek sayımı. */
export async function listSessions(formId: string): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('form_sessions')
    .select('*, form_entries(option_key)')
    .eq('form_id', formId)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) fail(error, 'Kayıtlar yüklenemedi. Tekrar deneyin.');
  return ((data as SessionWithEntries[] | null) ?? []).map(({ form_entries, ...row }) => {
    const counts: Record<string, number> = {};
    let filled = 0;
    for (const e of form_entries ?? []) {
      if (e.option_key === null) continue;
      filled += 1;
      counts[e.option_key] = (counts[e.option_key] ?? 0) + 1;
    }
    return { session: toSession(row), filled, counts };
  });
}

export async function createSession(input: {
  formId: string;
  sessionDate: string;
  title?: string | null;
}): Promise<FormSessionRow> {
  const { data, error } = await supabase
    .from('form_sessions')
    .insert({ form_id: input.formId, session_date: input.sessionDate, title: input.title ?? null, status: 'draft' })
    .select('*')
    .single();
  if (error) fail(error, 'Kayıt oluşturulamadı. Tekrar deneyin.');
  return toSession(data as FormSessionRow);
}

export async function getSession(sessionId: string): Promise<FormSessionRow> {
  const { data, error } = await supabase.from('form_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (error) fail(error, 'Kayıt yüklenemedi. Tekrar deneyin.');
  if (!data) throw new SessionsApiError('Kayıt bulunamadı. Silinmiş olabilir; kayıt listesine dönün.');
  return toSession(data as FormSessionRow);
}

export async function updateSessionStatus(sessionId: string, status: FormSessionStatus): Promise<FormSessionRow> {
  const { data, error } = await supabase
    .from('form_sessions')
    .update({ status })
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error) {
    fail(error, status === 'published' ? 'Kayıt yayınlanamadı. Tekrar deneyin.' : 'Kayıt taslağa alınamadı. Tekrar deneyin.');
  }
  return toSession(data as FormSessionRow);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('form_sessions').delete().eq('id', sessionId);
  if (error) fail(error, 'Kayıt silinemedi. Tekrar deneyin.');
}

// --- Girişler ---------------------------------------------------------------

export async function listEntries(sessionId: string): Promise<FormEntryRow[]> {
  const { data, error } = await supabase.from('form_entries').select('*').eq('session_id', sessionId);
  if (error) fail(error, 'Girişler yüklenemedi. Tekrar deneyin.');
  return (data as FormEntryRow[] | null) ?? [];
}

/** Yalnızca değişen satırlar gönderilir; (session_id, student_id) çakışmasında güncellenir. */
export async function upsertEntries(entries: readonly UpsertEntry[]): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await supabase
    .from('form_entries')
    .upsert(entries.map((e) => ({ ...e })), { onConflict: 'session_id,student_id' });
  if (error) fail(error, 'Değişiklikler kaydedilemedi. Bağlantınızı kontrol edip tekrar kaydedin.');
}
