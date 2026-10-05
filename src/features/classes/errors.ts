/**
 * Supabase / ağ hatalarını kullanıcıya gösterilecek Türkçe metne çevirir:
 * ne oldu + nasıl düzelir. Eyleme özel metin `fallback` ile verilir.
 */

export const dataMessages = {
  network: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
  session: 'Oturumunuzun süresi doldu. Çıkış yapıp tekrar giriş yapın.',
  notFound: 'Bu kayıt bulunamadı. Silinmiş olabilir; listeyi yenileyip tekrar deneyin.',
} as const;

interface ErrorLike {
  code?: unknown;
  message?: unknown;
  status?: unknown;
}

function asErrorLike(error: unknown): ErrorLike {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
}

export function isNetworkError(error: unknown): boolean {
  const { message } = asErrorLike(error);
  return (
    typeof message === 'string' &&
    /network request failed|failed to fetch|fetch failed|network error|timed? ?out/i.test(message)
  );
}

export function toUserMessage(error: unknown, fallback: string): string {
  if (isNetworkError(error)) return dataMessages.network;
  const { code, status } = asErrorLike(error);
  // PGRST301/303: JWT geçersiz ya da süresi dolmuş.
  if (code === 'PGRST301' || code === 'PGRST303' || status === 401) return dataMessages.session;
  // .single() satır bulamadı.
  if (code === 'PGRST116') return dataMessages.notFound;
  return fallback;
}
