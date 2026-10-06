/**
 * Mobilde sıfırlama bağlantısı derin bağlantı olarak gelir (expo-linking); tarayıcı adresi yoktur.
 * Web karşılığı: webUrl.web.ts.
 */

/** Uygulama açılırken tarayıcı adres çubuğundaki sıfırlama bağlantısı (yalnızca web, bir kez kullanılır). */
export function getInitialRecoveryUrl(): string | null {
  return null;
}

/** Web'de token'ları adres çubuğundan siler; mobilde hiçbir şey yapmaz. */
export function clearRecoveryFromAddressBar(): void {}

/** Şifre sıfırlama e-postasının `redirectTo` adresi için web kökü; mobilde null. */
export function webOrigin(): string | null {
  return null;
}
