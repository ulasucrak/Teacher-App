// d. Hesap ekranı: Sınıflarım "⋯ → Hesap" ile açılır, e-posta, ad, şifre değiştirme, çıkış ve hesap
// silme bölümleri görünür. Hiçbir şey kaydedilmez (sabit test hesabı).
import { expect, login, test, tid } from './support/app';
import { testAccount } from './support/env';

test('hesap ekranı açılır ve bölümleri görünür', async ({ page }) => {
  await login(page);
  await tid(page, 'classes-menu').click();
  await expect(tid(page, 'classes-menu-sheet')).toContainText(testAccount().email);
  await tid(page, 'classes-account').click();

  await expect(page).toHaveURL(/\/account$/);
  const screen = tid(page, 'account-screen');
  await expect(screen).toBeVisible({ timeout: 20_000 });
  await expect(screen).toContainText('Hesap bilgileriniz');
  await expect(tid(page, 'account-email')).toHaveValue(testAccount().email);
  await expect(tid(page, 'account-email')).not.toBeEditable();
  await expect(tid(page, 'account-name')).toBeEditable();
  await expect(tid(page, 'account-name')).not.toHaveValue('');
  await expect(tid(page, 'account-save-profile')).toBeVisible();
  await expect(tid(page, 'account-password')).toBeVisible();
  await expect(tid(page, 'account-password-confirmation')).toBeVisible();
  await expect(tid(page, 'account-change-password')).toBeVisible();
  await expect(tid(page, 'account-logout')).toBeVisible();
  await expect(tid(page, 'account-delete')).toBeVisible();

  // Silme onayı açılır ve vazgeçilir.
  await tid(page, 'account-delete').click();
  await expect(tid(page, 'account-delete-confirmation')).toContainText('Hesabınız silinsin mi?');
  await tid(page, 'account-delete-cancel').click();
  await expect(tid(page, 'account-delete-confirmation')).toHaveCount(0);

  // Doğrudan adresle açılır (yenileme dahil) ve geri Sınıflarım'a döner.
  await page.reload();
  await expect(tid(page, 'account-screen')).toBeVisible({ timeout: 30_000 });
  await tid(page, 'screen-back').click();
  await expect(tid(page, 'classes-screen')).toBeVisible();
});
