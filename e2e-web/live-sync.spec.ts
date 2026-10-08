// e. Canlı eşitleme: aynı hesapla açılmış iki bağımsız tarayıcı bağlamı (A ve B). Bir pencerede
// yapılan değişiklik, ilgili ekranı açık tutan diğer pencerede sayfa yenilenmeden
// LIVE_SYNC_TIMEOUT içinde görünür (Supabase Realtime, postgres_changes). Her iki yön ve geri
// alma/silme de denenir.
import type { Page } from '@playwright/test';

import {
  classRow,
  createClassViaWizard,
  deleteCurrentClass,
  escapeRegExp,
  expect,
  expectChosen,
  formRow,
  LIVE_SYNC_TIMEOUT,
  login,
  openSecondClient,
  test,
  tid,
} from './support/app';

const live = { timeout: LIVE_SYNC_TIMEOUT };

/** Sayfa yenilenirse kaybolan işaret: "yenilemeden" koşulunu doğrulamak için. */
async function markNoReload(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __e2eNoReload?: boolean }).__e2eNoReload = true;
  });
}

async function expectNotReloaded(page: Page): Promise<void> {
  const flag = await page.evaluate(() => (window as unknown as { __e2eNoReload?: boolean }).__e2eNoReload === true);
  expect(flag, 'B penceresi yenilenmemiş olmalı').toBe(true);
}

/** Realtime kanalının bağlanması için ekranın açılıp ilk yüklemenin bitmesi beklenir. */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

test.describe('canlı eşitleme (iki pencere, aynı hesap)', () => {
  test('sınıf, öğrenci ekleme/silme ve sınıf silme yenilemeden yansır', async ({ page: a, browser, consoleGuard, classPrefix }) => {
    const name = `${classPrefix} Canlı 5/D`;
    await login(a);
    const { context, page: b } = await openSecondClient(browser, consoleGuard);
    try {
      await markNoReload(b);
      await settle(b);

      // A sınıf oluşturur → B'nin Sınıflarım listesinde belirir.
      await createClassViaWizard(a, { name, students: ['Ece Tan', 'Mert Uçar'] });
      await expect(classRow(b, name)).toBeVisible(live);
      await expect(classRow(b, name)).toHaveAttribute('aria-label', new RegExp(`^${escapeRegExp(name)}, 2 öğrenci`));

      // B öğrencileri açar; A öğrenci ekler → B'de görünür.
      await classRow(b, name).click();
      await tid(b, 'class-students-row').click();
      await expect(tid(b, 'students-count')).toHaveText('2 öğrenci');
      await settle(b);

      await tid(a, 'class-students-row').click();
      await expect(tid(a, 'students-count')).toHaveText('2 öğrenci');
      await tid(a, 'students-menu').click();
      await tid(a, 'students-menu-add').click();
      await tid(a, 'students-add-paste').click();
      await expect(tid(a, 'import-screen')).toBeVisible();
      await tid(a, 'collect-paste-input').fill('Deniz Kurt');
      await tid(a, 'collect-paste-add').click();
      await tid(a, 'import-save').click();
      await expect(tid(a, 'students-count')).toHaveText('3 öğrenci', { timeout: 20_000 });

      await expect(tid(b, 'students-count')).toHaveText('3 öğrenci', live);
      await expect(tid(b, 'students-list').getByRole('button', { name: 'Deniz Kurt', exact: true })).toBeVisible(live);

      // Ters yön: B bir öğrenciyi siler → A'nın listesinden düşer.
      await tid(b, 'students-list').getByRole('button', { name: 'Ece Tan', exact: true }).click();
      await tid(b, 'student-sheet-delete').click();
      await tid(b, 'students-delete-confirm-confirm').click();
      await expect(tid(b, 'students-count')).toHaveText('2 öğrenci', { timeout: 15_000 });

      await expect(tid(a, 'students-count')).toHaveText('2 öğrenci', live);
      await expect(tid(a, 'students-list').getByRole('button', { name: 'Ece Tan', exact: true })).toHaveCount(0);

      // Silme: B Sınıflarım'a döner; A sınıfı siler → B'nin listesinden kalkar.
      await tid(b, 'screen-back').click();
      await tid(b, 'screen-back').click();
      await expect(classRow(b, name)).toBeVisible();
      await expect(classRow(b, name)).toHaveAttribute('aria-label', /, 2 öğrenci/, live);
      await settle(b);

      await tid(a, 'screen-back').click();
      await deleteCurrentClass(a, name);
      await expect(classRow(b, name)).toHaveCount(0, live);

      await expectNotReloaded(b);
    } finally {
      await context.close();
    }
  });

  test('işaretler iki yönde, geri alma ve geçmiş özeti yenilemeden yansır', async ({ page: a, browser, consoleGuard, classPrefix }) => {
    const name = `${classPrefix} Canlı 6/E`;
    await login(a);
    await createClassViaWizard(a, { name, students: ['Ada Er', 'Bora Göl'], extraForms: ['artieksi'] });

    const { context, page: b } = await openSecondClient(browser, consoleGuard);
    try {
      // İki pencere de aynı Artı / eksi panosunu açar.
      await classRow(b, name).click();
      await formRow(b, 'Artı / eksi').click();
      await expect(tid(b, 'mark-row-1')).toBeVisible({ timeout: 20_000 });
      await markNoReload(b);
      await formRow(a, 'Artı / eksi').click();
      await expect(tid(a, 'mark-row-1')).toBeVisible({ timeout: 20_000 });
      await settle(a);
      await settle(b);
      await expect(tid(b, 'mark-row-0-name')).toHaveText('Ada Er');

      // A işaretler → B'de görünür.
      await tid(a, 'mark-row-0-arti').click();
      await expect(tid(a, 'mark-row-0-net')).toHaveText('+1');
      await expect(tid(b, 'mark-row-0-net')).toHaveText('+1', live);
      await expect(tid(b, 'mark-day-trailing')).toHaveText('1 işaret', live);

      // Ters yön: B işaretler → A'da görünür (eksi işareti U+2212).
      await tid(b, 'mark-row-1-eksi').click();
      await expect(tid(b, 'mark-row-1-net')).toHaveText('−1');
      await expect(tid(a, 'mark-row-1-net')).toHaveText('−1', live);
      await expect(tid(a, 'mark-day-trailing')).toHaveText('2 işaret', live);

      // Geri alma: A, Ada'nın son işaretini geri alır → B'de silinir.
      await tid(a, 'mark-row-0-undo').click();
      // Geri alınınca satırda "Bugün" satırı kalmaz, net 0'a döner.
      await expect(tid(a, 'mark-row-0-net')).toHaveText('0');
      await expect(tid(a, 'mark-row-0-day')).toHaveCount(0);
      await expect(tid(b, 'mark-row-0-net')).toHaveText('0', live);
      await expect(tid(b, 'mark-row-0-day')).toHaveCount(0, live);
      await expect(tid(b, 'mark-day-trailing')).toHaveText('1 işaret', live);

      // B geçmiş özetini açık tutar; A yeni işaret verir → özet güncellenir.
      await tid(b, 'form-tab-history').click();
      await expect(tid(b, 'summary-list').getByRole('button', { name: 'Bora Göl: 1 Eksi, net −1' })).toBeVisible({
        timeout: 20_000,
      });
      await settle(b);
      await tid(a, 'mark-row-1-arti').click();
      await expect(tid(a, 'mark-row-1-net')).toHaveText('0');
      await expect(
        tid(b, 'summary-list').getByRole('button', { name: 'Bora Göl: 1 Artı, 1 Eksi, net 0' }),
      ).toBeVisible(live);

      await expectNotReloaded(b);

      // Temizlik: A sınıfı siler.
      await tid(a, 'screen-back').click();
      await expect(tid(a, 'class-students-row')).toBeVisible();
      await deleteCurrentClass(a, name);
    } finally {
      await context.close();
    }
  });
  test('günlük kayıt (Yoklama) kaydedilince diğer pencerede yenilemeden görünür', async ({ page: a, browser, consoleGuard, classPrefix }) => {
    const name = `${classPrefix} Canlı 7/G`;
    await login(a);
    await createClassViaWizard(a, { name, students: ['Cem Ak', 'Duru Sel'] });

    const { context, page: b } = await openSecondClient(browser, consoleGuard);
    try {
      // B bugünün Yoklama kaydını açık tutar (taslağı yok).
      await classRow(b, name).click();
      await formRow(b, 'Yoklama').click();
      await expect(tid(b, 'student-row-1')).toBeVisible({ timeout: 20_000 });
      await expect(tid(b, 'fill-day-trailing')).toHaveText('0/2');
      await markNoReload(b);
      await settle(b);

      // A doldurup kaydeder.
      await formRow(a, 'Yoklama').click();
      await expect(tid(a, 'student-row-1')).toBeVisible({ timeout: 20_000 });
      await tid(a, 'student-row-0-geldi').click();
      await tid(a, 'student-row-1-gelmedi').click();
      await tid(a, 'save-button').click();
      await expect(a.getByText('Kaydedildi')).toBeVisible({ timeout: 15_000 });

      await expect(tid(b, 'fill-day-trailing')).toHaveText('2/2', live);
      await expectChosen(tid(b, 'student-row-0-geldi'));
      await expectChosen(tid(b, 'student-row-1-gelmedi'));

      // Ters yön: B bir işareti değiştirip kaydeder → A'da görünür.
      await tid(b, 'student-row-1-izinli').click();
      await tid(b, 'save-button').click();
      await expect(b.getByText('Kaydedildi')).toBeVisible({ timeout: 15_000 });
      await expect(async () => expectChosen(tid(a, 'student-row-1-izinli'))).toPass(live);
      await expectChosen(tid(a, 'student-row-1-gelmedi'), false);

      await expectNotReloaded(b);

      await tid(a, 'screen-back').click();
      await expect(tid(a, 'class-students-row')).toBeVisible();
      await deleteCurrentClass(a, name);
    } finally {
      await context.close();
    }
  });
});
