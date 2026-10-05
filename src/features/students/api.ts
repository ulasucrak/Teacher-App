import { supabase } from '@/lib/supabase';
import type { StudentRow } from '@/types/database';

import { sortStudents } from './model';

/** Öğrenci listesi alanları (fotoğraf ve zaman damgası dahil). */
const STUDENT_COLUMNS = 'id, class_id, teacher_id, full_name, number, photo_url, created_at';

export interface NewStudent {
  full_name: string;
  number?: string | null;
}

export interface StudentPatch {
  full_name?: string;
  number?: string | null;
}

/** Sınıftaki öğrenciler, sınıf defteri sırasında (numara, sonra ad). */
export async function listStudents(classId: string): Promise<StudentRow[]> {
  const { data, error } = await supabase.from('students').select(STUDENT_COLUMNS).eq('class_id', classId);
  if (error) throw error;
  return sortStudents((data ?? []) as StudentRow[]);
}

/** Birden çok öğrenciyi tek istekte ekler (fotoğraftan içe aktarma da kullanabilir). */
export async function addStudents(classId: string, students: readonly NewStudent[]): Promise<StudentRow[]> {
  if (students.length === 0) return [];
  const rows = students.map((s) => ({ class_id: classId, full_name: s.full_name, number: s.number ?? null }));
  const { data, error } = await supabase.from('students').insert(rows).select(STUDENT_COLUMNS);
  if (error) throw error;
  return (data ?? []) as StudentRow[];
}

export async function addStudent(classId: string, student: NewStudent): Promise<StudentRow> {
  const [row] = await addStudents(classId, [student]);
  if (!row) throw new Error('Öğrenci kaydı döndürülmedi.');
  return row;
}

export async function updateStudent(studentId: string, patch: StudentPatch): Promise<StudentRow> {
  const { data, error } = await supabase
    .from('students')
    .update(patch)
    .eq('id', studentId)
    .select(STUDENT_COLUMNS)
    .single();
  if (error) throw error;
  return data as StudentRow;
}

/** Öğrencileri ve (veritabanında cascade ile) form kayıtlarını siler. */
export async function deleteStudents(studentIds: readonly string[]): Promise<void> {
  if (studentIds.length === 0) return;
  const { error } = await supabase.from('students').delete().in('id', [...studentIds]);
  if (error) throw error;
}
