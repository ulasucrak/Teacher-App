// f. Fotoğraftan öğrenci ekleme web'de yok: Türkçe "yalnızca mobil uygulamada" uyarısı görünür,
// fotoğraf düğmeleri kapalıdır; uyarıdaki "Listeyi yapıştır" yapıştırma alanını açar ve çalışır.
import { createClassViaWizard, deleteCurrentClass, expect, login, test, tid } from './support/app';

const WEB_UNAVAILABLE =
  'Fotoğraftan öğrenci ekleme yalnızca mobil uygulamada var. Burada listeyi yapıştırabilir ya da adları elle yazabilirsiniz.';

test('fotoğraf yolu uyarı gösterir, yapıştırma çalışır', async ({ page, classPrefix }) => {
  const name = `${classPrefix} 8/C`;
  await login(page);

  // Sihirbaz 2. adım: Fotoğraf yolu.
  await tid(page, 'classes-fab').or(tid(page, 'classes-empty-new')).click();
  await tid(page, 'wizard-name-input').fill(name);
  await tid(page, 'wizard-next').click();
  await expect(tid(page, 'wizard-step-2')).toBeVisible();
  await tid(page, 'collect-method-photo').click();
  await expect(tid(page, 'collect-photo-unavailable')).toContainText(WEB_UNAVAILABLE);
  await expect(tid(page, 'photo-camera')).toBeDisabled();
  await expect(tid(page, 'photo-library')).toBeDisabled();
  await tid(page, 'collect-photo-unavailable-paste').click();
  await tid(page, 'collect-paste-input').fill('Selin Bayezit\nEmre Karaca');
  await tid(page, 'collect-paste-add').click();
  await expect(tid(page, 'student-row-1-name')).toHaveValue('Emre Karaca');
  await tid(page, 'wizard-next').click();
  await tid(page, 'wizard-create').click();
  await expect(tid(page, 'class-student-count')).toHaveText('2', { timeout: 30_000 });

  // Öğrenciler → ⋯ → Öğrenci ekle → Fotoğraftan: aynı uyarı; yapıştırıp kaydet.
  await tid(page, 'class-students-row').click();
  await expect(tid(page, 'students-count')).toHaveText('2 öğrenci');
  await tid(page, 'students-menu').click();
  await tid(page, 'students-menu-add').click();
  await tid(page, 'students-add-photo').click();
  await expect(tid(page, 'import-screen')).toBeVisible({ timeout: 20_000 });
  await expect(tid(page, 'collect-photo-unavailable')).toContainText(WEB_UNAVAILABLE);
  await expect(tid(page, 'photo-library')).toBeDisabled();
  await tid(page, 'collect-photo-unavailable-paste').click();
  await tid(page, 'collect-paste-input').fill('12 Zeynep Arslan, 15 Burak Özdemir');
  await tid(page, 'collect-paste-add').click();
  await expect(tid(page, 'student-row-0-name')).toHaveValue('Zeynep Arslan');
  await expect(tid(page, 'student-row-0-number')).toHaveValue('12');
  await tid(page, 'import-save').click();
  await expect(tid(page, 'students-count')).toHaveText('4 öğrenci', { timeout: 30_000 });
  await expect(tid(page, 'students-list').getByRole('button', { name: /Burak Özdemir/ })).toBeVisible();

  await tid(page, 'screen-back').click();
  await expect(tid(page, 'class-student-count')).toHaveText('4');
  await deleteCurrentClass(page, name);
});
