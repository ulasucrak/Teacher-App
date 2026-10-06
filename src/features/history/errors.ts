import { isNetworkError } from '@/features/auth/errors';

export type HistoryAction = 'mark' | 'undo' | 'counts' | 'summary' | 'history' | 'marks';

const NETWORK = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';

const fallback: Record<HistoryAction, string> = {
  mark: 'İşaret kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
  undo: 'İşaret geri alınamadı. Tekrar deneyin.',
  counts: 'Sayılar yüklenemedi. Tekrar deneyin.',
  summary: 'Özet yüklenemedi. Tekrar deneyin.',
  history: 'Geçmiş yüklenemedi. Tekrar deneyin.',
  marks: 'İşaretler yüklenemedi. Tekrar deneyin.',
};

/** Migration'daki özel SQLSTATE kodları (20261008000000_form_modes_history.sql). */
const codeMessages: Record<string, string> = {
  TA001: 'Bu formda kayıt olduğu için türü değiştirilemez. Farklı türde yeni bir form oluşturun.',
  TA002: 'Bu form günde bir kez doldurulur; işaret eklenemez. Formu yeniden açın.',
  TA003: 'Öğrenci bu formun sınıfında değil. Listeyi yenileyip tekrar deneyin.',
  TA004: 'Bu seçenek formda artık yok. Formu yeniden açıp tekrar deneyin.',
  '23503': 'Form ya da öğrenci bulunamadı; silinmiş olabilir. Listeyi yenileyip tekrar deneyin.',
  '42501': 'Bu işlem için yetkiniz yok ya da oturumunuz sona erdi. Çıkış yapıp tekrar giriş yapın.',
  PGRST301: 'Oturumunuzun süresi doldu. Çıkış yapıp tekrar giriş yapın.',
};

/** Supabase / Postgres hatasını eyleme göre Türkçe, çözüm öneren cümleye çevirir. */
export function getHistoryErrorMessage(error: unknown, action: HistoryAction): string {
  if (isNetworkError(error)) return NETWORK;
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && codeMessages[code]) return codeMessages[code];
  }
  return fallback[action];
}

/** history/api.ts fonksiyonlarının fırlattığı hata: `message` doğrudan ekranda gösterilebilir. */
export class HistoryApiError extends Error {
  /** Postgres/PostgREST hata kodu (ör. "TA004"), varsa. */
  readonly code: string | null;
  readonly original: unknown;
  constructor(original: unknown, action: HistoryAction) {
    super(getHistoryErrorMessage(original, action));
    this.name = 'HistoryApiError';
    this.original = original;
    const code = original && typeof original === 'object' ? (original as { code?: unknown }).code : null;
    this.code = typeof code === 'string' ? code : null;
  }
}

/** Herhangi bir hatayı ekranda gösterilecek metne çevirir. */
export function historyErrorMessage(error: unknown, action: HistoryAction): string {
  return error instanceof HistoryApiError ? error.message : getHistoryErrorMessage(error, action);
}
