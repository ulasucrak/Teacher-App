/** Öğrenci içe aktarma için veri erişimi (Supabase). teacher_id gönderilmez: RLS varsayılanı doldurur. */
import { isNetworkError } from '@/features/auth/errors';
import { supabase } from '@/lib/supabase';
import type { ClassRow, StudentInsert, StudentRow } from '@/types/database';

import type { StudentDraft } from './review';

export const apiMessages = {
  network: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
  classNotFound: 'Sınıf bulunamadı. Silinmiş olabilir; sınıf listesine dönüp yeniden seçin.',
  loadFailed: 'Sınıf bilgileri yüklenemedi. Tekrar deneyin.',
  saveFailed: 'Öğrenciler eklenemedi. Listeyi kontrol edip tekrar deneyin.',
  sessionExpired: 'Oturumunuzun süresi doldu. Tekrar giriş yapın.',
} as const;

export class OcrApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OcrApiError';
  }
}

function toApiError(error: unknown, fallback: string): OcrApiError {
  if (error instanceof OcrApiError) return error;
  if (isNetworkError(error)) return new OcrApiError(apiMessages.network);
  const e = error as { code?: unknown; status?: unknown } | null;
  if (e && (e.code === 'PGRST301' || e.status === 401)) return new OcrApiError(apiMessages.sessionExpired);
  return new OcrApiError(fallback);
}

export interface ImportContext {
  classRow: ClassRow;
  students: StudentRow[];
}

/** Sınıfı ve mevcut öğrencilerini (yineleme uyarısı için) birlikte yükler. */
export async function fetchImportContext(classId: string): Promise<ImportContext> {
  try {
    const [classResult, studentResult] = await Promise.all([
      supabase.from('classes').select('*').eq('id', classId).maybeSingle(),
      supabase.from('students').select('*').eq('class_id', classId).order('created_at', { ascending: true }),
    ]);
    if (classResult.error) throw classResult.error;
    if (studentResult.error) throw studentResult.error;
    if (!classResult.data) throw new OcrApiError(apiMessages.classNotFound);
    return {
      classRow: classResult.data,
      students: studentResult.data ?? [],
    };
  } catch (error) {
    throw toApiError(error, apiMessages.loadFailed);
  }
}

/** Seçilen öğrencileri tek istekte ekler; eklenen satır sayısını döner. */
export async function insertStudents(classId: string, drafts: StudentDraft[]): Promise<number> {
  if (drafts.length === 0) return 0;
  const payload: StudentInsert[] = drafts.map((d) => ({
    class_id: classId,
    full_name: d.fullName,
    number: d.number,
  }));
  try {
    const { data, error } = await supabase.from('students').insert(payload).select('id');
    if (error) throw error;
    return data?.length ?? payload.length;
  } catch (error) {
    throw toApiError(error, apiMessages.saveFailed);
  }
}
