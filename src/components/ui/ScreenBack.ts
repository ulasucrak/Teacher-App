/** Kimlik doğrulama ekranları: geri, giriş ekranına döner. */
const AUTH_ROUTES = new Set(['register', 'forgot-password', 'reset-password']);

/** Yolun kendisi sayfa olmayan ara kesimleri ("/class/1/form" diye bir ekran yok). */
const NON_PAGE_SEGMENTS = new Set(['form', 'session']);

/**
 * Sayfa yolundan mantıksal üst ekranı bulur. Web'de sayfa yenilenince ya da bağlantıyla
 * açılınca geçmiş yoktur; geri düğmesi bu adrese `router.replace` ile gider.
 *
 * - `/class/1/students` → `/class/1`
 * - `/class/1/form/2/session/3` → `/class/1/form/2`
 * - `/class/1`, `/class/new`, `/account` → `/`
 * - `/register` → `/login`
 * - `/`, `/login` → `null` (üstü yok)
 */
export function screenParentHref(pathname: string | null | undefined): string | null {
  const path = (pathname ?? '').split(/[?#]/)[0] ?? '';
  const segments = path.split('/').filter(Boolean);
  const first = segments[0];
  if (first === undefined) return null;
  if (segments.length === 1) {
    if (first === 'login') return null;
    return AUTH_ROUTES.has(first) ? '/login' : '/';
  }
  const parent = segments.slice(0, -1);
  while (NON_PAGE_SEGMENTS.has(parent.at(-1) ?? '')) parent.pop();
  // `/class` tek başına bir ekran değil; sınıf listesi köktedir.
  if (parent.length <= 1) return '/';
  return `/${parent.join('/')}`;
}

/**
 * Tarayıcının şu anki yolu (web dışında boş). Yalnızca geçmiş yokken, yani sayfa bu adresle
 * açıldığında kullanılır; o anda adres çubuğu açık ekranın kendisidir.
 */
export function currentWebPathname(): string {
  return typeof window !== 'undefined' && typeof window.location?.pathname === 'string' ? window.location.pathname : '';
}
