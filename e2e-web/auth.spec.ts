// a. Hesap: yeni hesap aç (e2e+web<zaman>@sinifdefteri.test); e-posta doğrulaması kaydı
// engellerse sabit test hesabına düşülür. Oturum yenilemede korunur; çıkış yapılır. Yeni açılan
// hesap testin sonunda "Hesabımı sil" ile silinir (hesap birikmesin).
import { expect, login, signOutFromClasses, test, tid } from './support/app';
import { testAccount } from './support/env';

test('kayıt ya da giriş, yenilemede oturum korunur, çıkış', async ({ page }) => {
  const account = { email: `e2e+web${Date.now()}@sinifdefteri.test`, password: testAccount().password };

  await page.goto('/');
  await expect(tid(page, 'login-screen')).toBeVisible({ timeout: 30_000 });
  await tid(page, 'login-register').click();
  await expect(tid(page, 'register-screen')).toBeVisible();
  await tid(page, 'register-name').fill('E2E Web Öğretmen');
  await tid(page, 'register-email').fill(account.email);
  await tid(page, 'register-password').fill(account.password);
  await tid(page, 'register-submit').click();
  await expect(tid(page, 'classes-screen').or(tid(page, 'register-done'))).toBeVisible({ timeout: 30_000 });

  const freshAccount = await tid(page, 'classes-screen').isVisible();
  test.info().annotations.push({ type: 'hesap', description: freshAccount ? 'yeni hesap açıldı' : 'doğrulama gerekli: sabit test hesabı' });
  if (freshAccount) {
    // Yeni hesabın sınıfı yok; selamlama kayıttaki adı kullanır.
    await expect(tid(page, 'classes-empty')).toBeVisible();
    await expect(tid(page, 'classes-screen')).toContainText('E2E Web Öğretmen');
  } else {
    // E-posta doğrulaması açık: giriş ekranına dönülür, sabit test hesabıyla devam edilir.
    await tid(page, 'register-done').click();
    await expect(tid(page, 'login-screen')).toBeVisible();
    await login(page);
  }

  // Oturum yenilemede korunur (web'de localStorage).
  await page.reload();
  await expect(tid(page, 'classes-screen')).toBeVisible({ timeout: 30_000 });

  // Çıkış → giriş ekranı; yenileyince de giriş ekranı.
  await signOutFromClasses(page);
  await page.reload();
  await expect(tid(page, 'login-screen')).toBeVisible({ timeout: 30_000 });
  // Oturum gerektiren adres de girişe yönlenir.
  await page.goto('/account');
  await expect(tid(page, 'login-screen')).toBeVisible({ timeout: 30_000 });

  if (freshAccount) {
    // Yeniden giriş, sonra yeni hesabı sil.
    await login(page, account);
    await page.goto('/account');
    await expect(tid(page, 'account-screen')).toBeVisible({ timeout: 30_000 });
    await expect(tid(page, 'account-email')).toHaveValue(account.email);
    await tid(page, 'account-delete').click();
    await tid(page, 'account-delete-confirm').click();
    await expect(tid(page, 'login-screen')).toBeVisible({ timeout: 30_000 });
  }
});

test('yanlış şifre Türkçe hata gösterir', async ({ page }) => {
  await page.goto('/login');
  await expect(tid(page, 'login-screen')).toBeVisible({ timeout: 30_000 });
  await tid(page, 'login-email').fill(testAccount().email);
  await tid(page, 'login-password').fill('YanlisSifre123!');
  await tid(page, 'login-submit').click();
  await expect(tid(page, 'login-screen')).toContainText('E-posta ya da şifre hatalı', { timeout: 15_000 });
  await expect(tid(page, 'classes-screen')).toHaveCount(0);
});
