import { supabase } from '@/lib/supabase';
import type { ClassRow } from '@/types/database';

import { sortClasses, toClassSummary, type ClassRowWithCounts, type ClassSummary, type ValidClass } from './model';

const CLASS_WITH_COUNTS = '*, students(count), forms(count)';

/** Öğretmenin sınıfları, öğrenci ve form sayılarıyla (RLS yalnızca kendi sınıflarını döndürür). */
export async function listClasses(): Promise<ClassSummary[]> {
  const { data, error } = await supabase.from('classes').select(CLASS_WITH_COUNTS);
  if (error) throw error;
  return sortClasses(((data ?? []) as ClassRowWithCounts[]).map(toClassSummary));
}

export async function getClass(classId: string): Promise<ClassSummary> {
  const { data, error } = await supabase.from('classes').select(CLASS_WITH_COUNTS).eq('id', classId).single();
  if (error) throw error;
  return toClassSummary(data as ClassRowWithCounts);
}

/** `teacher_id` veritabanında auth.uid() ile dolar; gönderilmez. */
export async function createClass(input: ValidClass): Promise<ClassRow> {
  const { data, error } = await supabase.from('classes').insert(input).select('*').single();
  if (error) throw error;
  return data as ClassRow;
}

export async function updateClass(classId: string, patch: Partial<ValidClass>): Promise<ClassRow> {
  const { data, error } = await supabase.from('classes').update(patch).eq('id', classId).select('*').single();
  if (error) throw error;
  return data as ClassRow;
}

/** Sınıfı siler; öğrenciler, formlar ve kayıtlar veritabanında cascade ile silinir. */
export async function deleteClass(classId: string): Promise<void> {
  const { error } = await supabase.from('classes').delete().eq('id', classId);
  if (error) throw error;
}
