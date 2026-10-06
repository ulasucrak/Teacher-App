import type { FormMode } from '@/types/database';

/** Form türleri, seçicide görünecek sırayla. */
export const FORM_MODES: readonly FormMode[] = ['daily', 'repeatable'];

/** Tür adları (seçici, satır alt bilgisi). */
export const formModeLabels: Record<FormMode, string> = {
  daily: 'Günde bir kez',
  repeatable: 'Birikimli',
};

/** Türün tek cümlelik açıklaması (seçicinin altında). */
export const formModeDescriptions: Record<FormMode, string> = {
  daily: 'Her öğrenciye günde bir değer verilir; aynı gün yeniden işaretlemek öncekinin yerine geçer.',
  repeatable: 'Aynı gün bir öğrenciye birden çok işaret verilebilir; işaretler birikir.',
};

/** Veritabanındaki `mode` metnini birleşim türüne daraltır; bilinmeyen değer günlük sayılır. */
export function parseFormMode(value: unknown): FormMode {
  return value === 'repeatable' ? 'repeatable' : 'daily';
}
