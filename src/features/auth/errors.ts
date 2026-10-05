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
  linkExpired: 'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Giriş ekranından yeni bir sıfırlama bağlantısı isteyin.',
  samePassword: 'Yeni şifre eskisiyle aynı. Farklı bir şifre seçin.',
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
  otp_expired: 'linkExpired',
  flow_state_expired: 'linkExpired',
  flow_state_not_found: 'linkExpired',
  bad_code_verifier: 'linkExpired',
  same_password: 'samePassword',
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
  // Sıra önemli: "Email link is invalid…" e-posta hatası değil, bağlantı hatasıdır.
  [/link is invalid|has expired|otp.*expired|token has expired/i, 'linkExpired'],
  [/invalid.*email|email.*invalid|unable to validate email/i, 'invalidEmail'],
  [/should be different from the old password/i, 'samePassword'],
];

export function classifyAuthError(error: unknown): AuthErrorKind {
  if (!error || typeof error !== 'object') {
    return typeof error === 'string' ? classifyMessage(error) : 'unknown';
  }
  const e = error as ErrorLike;

  if (typeof e.code === 'string' && codeMap[e.code]) {
    return codeMap[e.code] as AuthErrorKind;
  }
  // `validation_failed` birçok farklı doğrulama hatasını kapsar: yalnızca mesaja bakılır,
  // tanınmazsa "bilinmeyen" döner (örneğin her zaman "e-posta geçersiz" denmez).
  if (e.code === 'validation_failed') {
    return typeof e.message === 'string' ? classifyMessage(e.message) : 'unknown';
  }
  if (isNetworkError(error)) {
    return 'network';
  }
  if (e.status === 429) return 'rateLimit';
  if (typeof e.message === 'string') return classifyMessage(e.message);
  return 'unknown';
}

/** Ağ hatası mı (sunucuya hiç ulaşılamadı)? */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as ErrorLike;
  if (e.name === 'AuthRetryableFetchError') return true;
  return typeof e.message === 'string' && /network request failed|failed to fetch|fetch failed|network error/i.test(e.message);
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
