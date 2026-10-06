import { isRecoveryUrl } from './recovery';

/**
 * Sayfa ilk yüklendiğinde (yönlendirici adresi değiştirmeden önce) okunur: e-postadaki bağlantı
 * `https://…/reset-password#access_token=…` biçiminde gelir.
 */
const href = typeof window === 'undefined' ? null : window.location.href;
let initialUrl: string | null = isRecoveryUrl(href) ? href : null;

/** Adres çubuğu temizlenene kadar açılıştaki sıfırlama bağlantısını döndürür. */
export function getInitialRecoveryUrl(): string | null {
  return initialUrl;
}

/** Token'lar oturum kurulduktan sonra adres çubuğunda ve tarayıcı geçmişinde kalmasın. */
export function clearRecoveryFromAddressBar(): void {
  // Token'lar tek kullanımlık: ekran yeniden açılırsa eski bağlantı tekrar denenmesin.
  initialUrl = null;
  if (typeof window === 'undefined') return;
  const { pathname, hash, search } = window.location;
  if (!hash && !search) return;
  window.history.replaceState(window.history.state, '', pathname);
}

export function webOrigin(): string | null {
  return typeof window === 'undefined' ? null : window.location.origin;
}
