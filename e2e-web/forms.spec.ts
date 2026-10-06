// c. Formlar: "+ Form" → Sözlü eklenir. Yoklama (günlük): Tümü Geldi, bir öğrenci Gelmedi, Kaydet;
// yeniden açınca kayıtlı; Geçmiş özeti sayıları gösterir. Artı / eksi (birikimli): işaretle, geri
// al, Geçmiş özeti ve liste.
import { createClassViaWizard, deleteCurrentClass, expect, expectChosen, formRow, login, test, tid } from './support/app';

const STUDENTS = ['Can Demir', 'Ali Yılmaz', 'Ayşe Kaya'];

test('form ekleme, yoklama doldurma, birikimli işaretler ve geçmiş', async ({ page, classPrefix }) => {
  const name = `${classPrefix} 7/F`;
  await login(page);
  await createClassViaWizard(page, { name, students: STUDENTS, extraForms: ['artieksi'] });

  // "+ Form" → Sözlü.
  await tid(page, 'class-add-form').click();
  await expect(tid(page, 'add-form-sheet')).toBeVisible();
  await tid(page, 'add-form-preset-sozlu').click();
  await expect(formRow(page, 'Sözlü')).toBeVisible({ timeout: 15_000 });

  // Yoklama: bugünün kaydı.
  await formRow(page, 'Yoklama').click();
  await expect(tid(page, 'student-row-0')).toBeVisible({ timeout: 20_000 });
  await tid(page, 'bulk-geldi').click();
  await tid(page, 'student-row-1-gelmedi').click();
  await expectChosen(tid(page, 'student-row-1-gelmedi'));
  await expect(tid(page, 'fill-day-trailing')).toHaveText('3/3');
  const absent = (await tid(page, 'student-row-1-name').textContent()) ?? '';
  await tid(page, 'save-button').click();
  await expect(page.getByText('Kaydedildi')).toBeVisible({ timeout: 15_000 });

  // Yeniden aç: kayıt sunucudan yüklenir.
  await tid(page, 'screen-back').click();
  await expect(tid(page, 'class-students-row')).toBeVisible();
  await expect(formRow(page, 'Yoklama')).not.toHaveAttribute('aria-label', /Henüz kayıt yok/);
  await formRow(page, 'Yoklama').click();
  await expect(tid(page, 'student-row-1-name')).toHaveText(absent, { timeout: 20_000 });
  await expectChosen(tid(page, 'student-row-1-gelmedi'));
  await expectChosen(tid(page, 'student-row-0-geldi'));
  await expectChosen(tid(page, 'student-row-1-geldi'), false);

  // Geçmiş → Özet: 2 Geldi, 1 Gelmedi.
  await tid(page, 'form-tab-history').click();
  await expect(tid(page, 'summary-totals-counts')).toHaveAccessibleName(/2 Geldi/, { timeout: 20_000 });
  await expect(tid(page, 'summary-totals-counts')).toHaveAccessibleName(/1 Gelmedi/);
  await tid(page, 'screen-back').click();

  // Artı / eksi: tek dokunuş bir işaret; geri al; Geçmiş özeti.
  await formRow(page, 'Artı / eksi').click();
  await expect(tid(page, 'mark-row-0')).toBeVisible({ timeout: 20_000 });
  const first = (await tid(page, 'mark-row-0-name').textContent()) ?? '';
  const second = (await tid(page, 'mark-row-1-name').textContent()) ?? '';
  await tid(page, 'mark-row-0-arti').click();
  await tid(page, 'mark-row-0-arti').click();
  await tid(page, 'mark-row-1-eksi').click();
  await expect(tid(page, 'mark-row-0-net')).toHaveText('+2');
  await expect(tid(page, 'mark-row-1-net')).toHaveText('−1'); // eksi işareti U+2212
  await expect(tid(page, 'mark-today-total')).toHaveText('3 işaret');
  await tid(page, 'mark-row-0-undo').click();
  await expect(tid(page, 'mark-row-0-net')).toHaveText('+1');
  await expect(tid(page, 'mark-today-total')).toHaveText('2 işaret');

  await tid(page, 'form-tab-history').click();
  await expect(tid(page, 'summary-totals-net')).toHaveText('0', { timeout: 20_000 });
  const summary = tid(page, 'summary-list');
  await expect(summary.getByRole('button', { name: `${first}: 1 Artı, net +1` })).toBeVisible();
  await expect(summary.getByRole('button', { name: `${second}: 1 Eksi, net −1` })).toBeVisible();
  // Liste: yapılan her işlem.
  await tid(page, 'history-view-list').click();
  await expect(tid(page, 'timeline-list')).toBeVisible({ timeout: 20_000 });
  await expect(tid(page, 'timeline-list')).toContainText(first);
  await expect(tid(page, 'timeline-list')).toContainText(second);

  await tid(page, 'screen-back').click();
  await expect(tid(page, 'class-students-row')).toBeVisible();
  await deleteCurrentClass(page, name);
});
