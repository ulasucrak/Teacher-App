import { isNetworkError } from '@/features/auth';

export type FormsAction = 'load' | 'save' | 'copy' | 'archive' | 'delete';

const NETWORK = 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';

const fallback: Record<FormsAction, string> = {
  load: 'Formlar yüklenemedi. Sayfayı yenileyip tekrar deneyin.',
  save: 'Form kaydedilemedi. Bilgileri kontrol edip tekrar deneyin.',
  copy: 'Form kopyalanamadı. Tekrar deneyin; sorun sürerse sınıf listesini yenileyin.',
  archive: 'Form arşivlenemedi. Tekrar deneyin.',
  delete: 'Form silinemedi. Tekrar deneyin.',
};

interface PgErrorLike {
  code?: unknown;
  message?: unknown;
}

/** Supabase / Postgres hatasını eyleme göre Türkçe, çözüm öneren bir cümleye çevirir. */
export function getFormsErrorMessage(error: unknown, action: FormsAction): string {
  if (isNetworkError(error)) return NETWORK;
  if (error && typeof error === 'object') {
    const e = error as PgErrorLike;
    if (e.code === '42501' || e.code === 'PGRST301') {
      return 'Bu form için yetkiniz yok ya da oturumunuz sona erdi. Çıkış yapıp tekrar giriş yapın.';
    }
    if (e.code === 'PGRST116') {
      return 'Form bulunamadı; silinmiş olabilir. Form listesine dönüp tekrar deneyin.';
    }
    if (e.code === '23514') {
      return 'Seçenekler geçersiz. Her seçeneğe bir ad ve renk verin, sonra tekrar kaydedin.';
    }
    if (e.code === 'TA001') {
      return 'Bu formda kayıt olduğu için türü değiştirilemez. Farklı türde yeni bir form oluşturun.';
    }
  }
  return fallback[action];
}

/** api.ts fonksiyonlarının fırlattığı hata: `message` doğrudan ekranda gösterilebilir. */
export class FormsError extends Error {
  readonly original: unknown;
  constructor(original: unknown, action: FormsAction) {
    super(getFormsErrorMessage(original, action));
    this.name = 'FormsError';
    this.original = original;
  }
}

export function errorMessage(error: unknown, action: FormsAction): string {
  return error instanceof FormsError ? error.message : getFormsErrorMessage(error, action);
}
