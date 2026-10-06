// b. Sınıf akışı: sihirbazla sınıf (yapıştırılan liste, Türkçe harfler) → öğrenciler görünür →
// arama, ad düzenleme, öğrenci silme → sınıfı sil.
import { classRow, createClassViaWizard, deleteCurrentClass, expect, login, test, tid } from './support/app';

const STUDENTS = ['Ayşe Yılmaz', 'İlker Doğan', 'Şule Ağaoğlu', 'Gökhan Çelik', 'İpek Öztürk'];

test('sihirbazla sınıf, öğrenci düzenleme ve silme', async ({ page, classPrefix }) => {
  const name = `${classPrefix} 6/A`;
  await login(page);
  await createClassViaWizard(page, { name, students: STUDENTS, extraForms: ['odev'] });

  await expect(tid(page, 'class-student-count')).toHaveText('5');
  await expect(tid(page, 'form-row-0')).toHaveAttribute('aria-label', /^Yoklama,/);
  await expect(tid(page, 'class-screen').getByRole('button', { name: /^Ödev kontrolü,/ })).toBeVisible();

  // Sınıflarım'da satır görünür (öğrenci ve form sayısıyla).
  await tid(page, 'screen-back').click();
  await expect(classRow(page, name)).toHaveAttribute('aria-label', `${name}, 5 öğrenci, 2 form`);
  await classRow(page, name).click();

  // Öğrenciler: hepsi listede.
  await tid(page, 'class-students-row').click();
  await expect(tid(page, 'students-count')).toHaveText('5 öğrenci');
  for (const student of STUDENTS) {
    await expect(tid(page, 'students-list').getByRole('button', { name: student, exact: true })).toBeVisible();
  }

  // Arama Türkçe harfleri yok sayar: "ayse" → Ayşe Yılmaz.
  await tid(page, 'students-search').fill('ayse');
  await expect(tid(page, 'student-row-0')).toHaveAccessibleName('Ayşe Yılmaz');
  await expect(tid(page, 'student-row-1')).toHaveCount(0);

  // Adı düzenle.
  await tid(page, 'student-row-0').click();
  await expect(tid(page, 'student-sheet')).toBeVisible();
  await tid(page, 'student-sheet-name').fill('Ayşe Yılmaz Kaya');
  await tid(page, 'student-sheet-save').click();
  await expect(page.getByText('Kaydedildi')).toBeVisible({ timeout: 15_000 });
  await expect(tid(page, 'student-row-0')).toHaveAccessibleName('Ayşe Yılmaz Kaya');

  // Sil (düzenleme paneli → Öğrenciyi sil → onay).
  await tid(page, 'student-row-0').click();
  await tid(page, 'student-sheet-delete').click();
  await tid(page, 'students-delete-confirm-confirm').click();
  await expect(tid(page, 'students-no-match')).toBeVisible({ timeout: 15_000 });
  await tid(page, 'students-search').fill('');
  await expect(tid(page, 'students-count')).toHaveText('4 öğrenci');

  // Sınıf ekranındaki sayı da güncel.
  await tid(page, 'screen-back').click();
  await expect(tid(page, 'class-student-count')).toHaveText('4');

  // Temizlik: arayüzden sınıfı sil.
  await deleteCurrentClass(page, name);
});
