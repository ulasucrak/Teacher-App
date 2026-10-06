import { supabase } from '@/lib/supabase';
import type { ClassRow, FormMode, FormOption, FormRow, Tables } from '@/types/database';

import { FormsError } from './errors';
import { groupFormsByClass, type ClassFormsGroup, type ClassSummary } from './format';
import { parseFormMode } from './mode';
import { parseOptions } from './options';

type RawForm = Tables<'forms'>;

export interface FormListItem extends FormRow {
  /**
   * Son kaydın günü (YYYY-MM-DD): günlük formda son oturum, birikimli formda son işaret.
   * Hiç kayıt yoksa null.
   */
  lastSessionDate: string | null;
}

export interface FormInput {
  title: string;
  subject: string | null;
  description: string | null;
  options: FormOption[];
  /**
   * Form türü. Oluştururken verilmezse veritabanı `daily` yazar; güncellerken verilmezse
   * değişmez. Formda kayıt ya da işaret varken farklı bir tür kaydedilemez (TA001).
   */
  mode?: FormMode;
}

function toFormRow(raw: RawForm): FormRow {
  return { ...raw, options: parseOptions(raw.options), mode: parseFormMode(raw.mode) };
}

function laterDate(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a > b ? a : b;
}

/** Sınıfın tüm formları (arşivdekiler dahil), son kayıt tarihiyle birlikte. */
export async function listForms(classId: string): Promise<FormListItem[]> {
  const { data, error } = await supabase
    .from('forms')
    .select('*, form_sessions(session_date), form_marks(mark_date)')
    .eq('class_id', classId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
    .order('session_date', { referencedTable: 'form_sessions', ascending: false })
    .limit(1, { referencedTable: 'form_sessions' })
    .order('mark_date', { referencedTable: 'form_marks', ascending: false })
    .limit(1, { referencedTable: 'form_marks' });
  if (error) throw new FormsError(error, 'load');
  return (data ?? []).map(({ form_sessions, form_marks, ...raw }) => ({
    ...toFormRow(raw),
    lastSessionDate: laterDate(form_sessions?.[0]?.session_date, form_marks?.[0]?.mark_date),
  }));
}

/**
 * Formda kayıt (günlük oturum) ya da işaret var mı? Varsa türü değiştirilemez;
 * düzenleme ekranı tür seçicisini buna göre kilitler.
 */
export async function formHasRecords(formId: string): Promise<boolean> {
  const [sessions, marks] = await Promise.all([
    supabase.from('form_sessions').select('id', { count: 'exact', head: true }).eq('form_id', formId),
    supabase.from('form_marks').select('id', { count: 'exact', head: true }).eq('form_id', formId),
  ]);
  if (sessions.error) throw new FormsError(sessions.error, 'load');
  if (marks.error) throw new FormsError(marks.error, 'load');
  return (sessions.count ?? 0) > 0 || (marks.count ?? 0) > 0;
}

export async function getForm(formId: string): Promise<FormRow> {
  const { data, error } = await supabase.from('forms').select('*').eq('id', formId).single();
  if (error) throw new FormsError(error, 'load');
  return toFormRow(data);
}

export async function getClass(classId: string): Promise<ClassRow> {
  const { data, error } = await supabase.from('classes').select('*').eq('id', classId).single();
  if (error) throw new FormsError(error, 'load');
  return data;
}

/** Öğretmenin tüm sınıfları (RLS yalnızca kendi sınıflarını döndürür). */
export async function listClasses(): Promise<ClassSummary[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, grade, section')
    .order('name', { ascending: true });
  if (error) throw new FormsError(error, 'load');
  return data ?? [];
}

export async function createForm(classId: string, input: FormInput): Promise<FormRow> {
  const { data: last, error: orderError } = await supabase
    .from('forms')
    .select('sort_order')
    .eq('class_id', classId)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (orderError) throw new FormsError(orderError, 'save');
  const lastOrder = last?.[0]?.sort_order;
  const sortOrder = typeof lastOrder === 'number' ? lastOrder + 1 : 0;

  const { data, error } = await supabase
    .from('forms')
    .insert({ class_id: classId, ...input, sort_order: sortOrder })
    .select('*')
    .single();
  if (error) throw new FormsError(error, 'save');
  return toFormRow(data);
}

export async function updateForm(formId: string, input: FormInput): Promise<FormRow> {
  const { data, error } = await supabase.from('forms').update(input).eq('id', formId).select('*').single();
  if (error) throw new FormsError(error, 'save');
  return toFormRow(data);
}

export async function archiveForm(formId: string, archived = true): Promise<void> {
  const { error } = await supabase.from('forms').update({ archived }).eq('id', formId);
  if (error) throw new FormsError(error, 'archive');
}

/** Formu ve (cascade ile) tüm oturum ve işaretlemelerini siler. */
export async function deleteForm(formId: string): Promise<void> {
  const { error } = await supabase.from('forms').delete().eq('id', formId);
  if (error) throw new FormsError(error, 'delete');
}

/** Formun başlık, ders, açıklama, seçenek ve türünü verilen sınıflara kopyalar. Eklenen form sayısını döndürür. */
export async function copyFormToClasses(formId: string, classIds: readonly string[]): Promise<number> {
  if (classIds.length === 0) return 0;
  const { data, error } = await supabase.rpc('copy_form_to_classes', {
    p_form_id: formId,
    p_class_ids: [...classIds],
  });
  if (error) throw new FormsError(error, 'copy');
  return Array.isArray(data) ? data.length : 0;
}

/** Bu sınıf dışındaki sınıfların (arşivlenmemiş) formları, sınıfa göre gruplu. */
export async function listOtherClassesForms(classId: string): Promise<ClassFormsGroup[]> {
  const { data, error } = await supabase
    .from('forms')
    .select('*, classes(id, name, grade, section)')
    .neq('class_id', classId)
    .eq('archived', false)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw new FormsError(error, 'load');
  return groupFormsByClass(
    (data ?? [])
      .filter((r): r is RawForm & { classes: ClassSummary } => Boolean(r.classes))
      .map(({ classes, ...raw }) => ({ ...toFormRow(raw), classInfo: classes })),
  );
}
