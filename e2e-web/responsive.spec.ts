// g. Duyarlı tasarım duman testi: 390 px (telefon tarayıcısı) ve 1280 px (masaüstü) genişlikte
// başlıca ekranlar açılır, yatay taşma olmaz, ana eylemler görünür ve ekranın içindedir. Konsol
// hatası olan test başarısız sayılır (support/app.ts → consoleGuard; izin listesi orada).
import type { Locator, Page } from '@playwright/test';

import { classRow, createClassViaWizard, deleteCurrentClass, expect, formRow, login, test, tid } from './support/app';

/** Masaüstünde içerik ortada en fazla bu genişlikte durur (src/lib/platform.ts WEB_MAX_CONTENT_WIDTH). */
const MAX_CONTENT_WIDTH = 720;

const VIEWPORTS = [
  { label: 'telefon 390px', width: 390, height: 844 },
  { label: 'masaüstü 1280px', width: 1280, height: 800 },
];

async function expectNoHorizontalOverflow(page: Page, where: string): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `${where}: yatay taşma`).toBeLessThanOrEqual(innerWidth);
}

async function expectInViewport(page: Page, locator: Locator, where: string): Promise<void> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, `${where}: öğe çizilmedi`).not.toBeNull();
  if (!box || !viewport) return;
  expect(box.x, `${where}: sol kenar dışarıda`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, `${where}: sağ kenar dışarıda`).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(box.y + box.height, `${where}: alt kenar dışarıda`).toBeLessThanOrEqual(viewport.height + 0.5);
}

async function expectFramed(page: Page, screen: Locator, where: string): Promise<void> {
  const viewport = page.viewportSize();
  const box = await screen.boundingBox();
  if (!viewport || !box) return;
  if (viewport.width > MAX_CONTENT_WIDTH) {
    // Masaüstü: okunur genişlikte ve ortada.
    expect(box.width, `${where}: içerik genişliği`).toBeLessThanOrEqual(MAX_CONTENT_WIDTH + 1);
    const center = box.x + box.width / 2;
    expect(Math.abs(center - viewport.width / 2), `${where}: içerik ortada`).toBeLessThanOrEqual(2);
  } else {
    // Telefon: tam genişlik.
    expect(box.width, `${where}: tam genişlik`).toBeGreaterThanOrEqual(viewport.width - 1);
  }
}

for (const vp of VIEWPORTS) {
  test.describe(vp.label, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('başlıca ekranlar taşmadan açılır, konsol hatası yok', async ({ page, classPrefix }) => {
      const name = `${classPrefix} ${vp.width}`;

      await page.goto('/login');
      await expect(tid(page, 'login-screen')).toBeVisible({ timeout: 30_000 });
      await expectNoHorizontalOverflow(page, 'giriş');
      await expectInViewport(page, tid(page, 'login-submit'), 'giriş düğmesi');
      await expectFramed(page, tid(page, 'login-screen'), 'giriş');

      await login(page);
      await expectNoHorizontalOverflow(page, 'Sınıflarım');
      await expectFramed(page, tid(page, 'classes-screen'), 'Sınıflarım');

      await createClassViaWizard(page, {
        name,
        students: ['Ayşe Yılmaz', 'İlker Doğan', 'Şule Ağaoğlu', 'Gökhan Çelik', 'İpek Öztürk', 'Kerem Aydoğan'],
        extraForms: ['artieksi'],
      });
      await expectNoHorizontalOverflow(page, 'sınıf ekranı');
      await expectInViewport(page, tid(page, 'class-add-form'), '"+ Form"');
      await expectFramed(page, tid(page, 'class-screen'), 'sınıf ekranı');

      // Form ekleme paneli ekranın içinde.
      await tid(page, 'class-add-form').click();
      await expect(tid(page, 'add-form-sheet')).toBeVisible();
      await expectInViewport(page, tid(page, 'add-form-sheet-close'), 'panel kapatma');
      await expectNoHorizontalOverflow(page, 'form ekleme paneli');
      await tid(page, 'add-form-sheet-close').click();
      await expect(tid(page, 'add-form-sheet')).toHaveCount(0);

      // Yoklama: dört seçenek tek satırda, Kaydet görünür.
      await formRow(page, 'Yoklama').click();
      await expect(tid(page, 'student-row-0')).toBeVisible({ timeout: 20_000 });
      await expectNoHorizontalOverflow(page, 'Yoklama');
      await expectInViewport(page, tid(page, 'student-row-0-izinli'), 'son seçenek');
      await expectInViewport(page, tid(page, 'save-button'), 'Kaydet');
      await tid(page, 'screen-back').click();

      // Artı / eksi panosu ve geçmiş.
      await formRow(page, 'Artı / eksi').click();
      await expect(tid(page, 'mark-row-0')).toBeVisible({ timeout: 20_000 });
      await expectNoHorizontalOverflow(page, 'Artı / eksi');
      await expectInViewport(page, tid(page, 'mark-row-0-eksi'), 'Eksi düğmesi');
      await tid(page, 'form-tab-history').click();
      await expect(tid(page, 'summary-empty').or(tid(page, 'summary-list'))).toBeVisible({ timeout: 20_000 });
      await expectNoHorizontalOverflow(page, 'Geçmiş');
      await tid(page, 'screen-back').click();

      // Öğrenciler.
      await tid(page, 'class-students-row').click();
      await expect(tid(page, 'students-count')).toHaveText('6 öğrenci');
      await expectNoHorizontalOverflow(page, 'Öğrenciler');
      await expectInViewport(page, tid(page, 'students-search'), 'arama');
      await tid(page, 'screen-back').click();

      // Hesap.
      await page.goto('/account');
      await expect(tid(page, 'account-screen')).toBeVisible({ timeout: 30_000 });
      await expectNoHorizontalOverflow(page, 'Hesap');
      await expectFramed(page, tid(page, 'account-screen'), 'Hesap');

      // Temizlik.
      await page.goto('/');
      await expect(tid(page, 'classes-screen')).toBeVisible({ timeout: 30_000 });
      await classRow(page, name).click();
      await expect(tid(page, 'class-screen')).toBeVisible();
      await deleteCurrentClass(page, name);
    });
  });
}
