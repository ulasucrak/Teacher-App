/**
 * Supabase Auth hatalarını kullanıcıya gösterilecek Türkçe metne çevirir.
 * Biçim: ne oldu + nasıl düzelir. Özür yok, belirsiz "bir hata oluştu" yok.
 */

export const authMessages = {
  invalidCredentials: 'E-posta ya da şifre hatalı. Bilgilerinizi kontrol edip tekrar deneyin.',
  emailNotConfirmed:
    'E-posta adresiniz henüz doğrulanmadı. Gelen kutunuzdaki doğrulama bağlantısına dokunun, sonra giriş yapın.',
  weakPassword: 'Şifre çok zayıf. En az 8 karakter kullanın; harf ve rakamı birlikte kullanın.',
  userAlreadyExists: 'Bu e-posta ile zaten bir hesap var. Giriş yapın ya da şifrenizi sıfırlayın.',
  network: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.',
  rateLimit: 'Çok fazla deneme yapıldı. Birkaç dakika bekleyip tekrar deneyin.',
  invalidEmail: 'E-posta adresi geçersiz. "ad@okul.com" biçiminde yazın.',
  sessionExpired: 'Oturumunuzun süresi doldu. Tekrar giriş yapın.',
  unknown: 'İşlem tamamlanamadı. Tekrar deneyin; sorun sürerse uygulamayı yeniden başlatın.',
} as const;

export type AuthErrorKind = keyof typeof authMessages;

interface ErrorLike {
  code?: unknown;
  name?: unknown;
  message?: unknown;
  status?: unknown;
}

const codeMap: Record<string, AuthErrorKind> = {
  invalid_credentials: 'invalidCredentials',
  invalid_grant: 'invalidCredentials',
  email_not_confirmed: 'emailNotConfirmed',
  weak_password: 'weakPassword',
  user_already_exists: 'userAlreadyExists',
  email_exists: 'userAlreadyExists',
  over_request_rate_limit: 'rateLimit',
  over_email_send_rate_limit: 'rateLimit',
  email_address_invalid: 'invalidEmail',
  validation_failed: 'invalidEmail',
  session_expired: 'sessionExpired',
  session_not_found: 'sessionExpired',
  refresh_token_not_found: 'sessionExpired',
};

const messagePatterns: [RegExp, AuthErrorKind][] = [
  [/invalid login credentials/i, 'invalidCredentials'],
  [/email not confirmed/i, 'emailNotConfirmed'],
  [/password should be|weak password|password is too weak/i, 'weakPassword'],
  [/already registered|already exists/i, 'userAlreadyExists'],
  [/network request failed|failed to fetch|fetch failed|network error|timed? ?out/i, 'network'],
  [/rate limit|too many requests/i, 'rateLimit'],
  [/invalid.*email|email.*invalid/i, 'invalidEmail'],
];

export function classifyAuthError(error: unknown): AuthErrorKind {
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' ? classifyMessage(error) : 'unknown';
  }
  const e = error as ErrorLike;

  if (typeof e.code === 'string' && codeMap[e.code]) {
    return codeMap[e.code] as AuthErrorKind;
  }
  if (e.name === 'AuthRetryableFetchError' || e.name === 'TypeError' && /fetch|network/i.test(String(e.message))) {
    return 'network';
  }
  if (e.status === 429) return 'rateLimit';
  if (typeof e.message === 'string') return classifyMessage(e.message);
  return 'unknown';
}

function classifyMessage(message: string): AuthErrorKind {
  for (const [pattern, kind] of messagePatterns) {
    if (pattern.test(message)) return kind;
  }
  return 'unknown';
}

/** Herhangi bir hatayı ekranda gösterilecek Türkçe cümleye çevirir. */
export function getAuthErrorMessage(error: unknown): string {
  return authMessages[classifyAuthError(error)];
}
