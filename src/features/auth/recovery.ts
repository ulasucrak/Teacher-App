/**
 * Şifre sıfırlama bağlantısının çözümlenmesi.
 * Supabase e-postadaki bağlantıyı `redirectTo` adresine yönlendirir:
 * - implicit akış: `teacherapp://reset-password#access_token=…&refresh_token=…&type=recovery`
 * - PKCE akışı:    `teacherapp://reset-password?code=…`
 * - hata:          `…#error=access_denied&error_code=otp_expired&error_description=…`
 */

export type RecoveryParams =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'error'; code: string | null; description: string | null }
  | { kind: 'none' };

/** Expo Router'daki şifre sıfırlama rotası (redirectTo bunun üzerinden kurulur). */
export const RESET_PASSWORD_PATH = '/reset-password';

function parsePairs(part: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of part.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    try {
      map.set(decodeURIComponent(rawKey), decodeURIComponent(rawValue.replace(/\+/g, ' ')));
    } catch {
      map.set(rawKey, rawValue);
    }
  }
  return map;
}

export function parseRecoveryUrl(url: string | null | undefined): RecoveryParams {
  if (!url) return { kind: 'none' };
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const query = queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1);

  // Hash değerleri sorgu değerlerinin üstüne yazılır (Supabase implicit akışı hash kullanır).
  const params = new Map([...parsePairs(query), ...parsePairs(hash)]);

  const error = params.get('error') ?? params.get('error_code');
  if (error) {
    return {
      kind: 'error',
      code: params.get('error_code') ?? params.get('error') ?? null,
      description: params.get('error_description') ?? null,
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };

  const code = params.get('code');
  if (code) return { kind: 'code', code };

  return { kind: 'none' };
}

/** Bağlantı, şifre sıfırlama parametrelerinden (token, kod ya da hata) birini taşıyor mu? */
export function isRecoveryUrl(url: string | null | undefined): url is string {
  return Boolean(url && url.includes(RESET_PASSWORD_PATH.slice(1)) && /[#?&](access_token|code|error)=/.test(url));
}

/** Web'de e-postadaki bağlantının döneceği adres: sitenin kökü + /reset-password. */
export function webResetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}${RESET_PASSWORD_PATH}`;
}
