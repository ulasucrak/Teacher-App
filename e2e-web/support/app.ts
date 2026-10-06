// Ortak test düzeni: konsol hatası bekçisi, tarayıcı pencerelerini (confirm/alert) onaylama,
// görünür testID seçicisi ve sık kullanılan akışlar (giriş, sihirbaz, sınıf silme).
import { test as base, expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';

import { CLASS_PREFIX, deleteClassesByPrefix } from './api';
import { testAccount } from './env';

export { expect };

/** Canlı eşitleme beklemesi: değişiklik diğer pencerede bu süre içinde görünmeli. */
export const LIVE_SYNC_TIMEOUT = 8_000;

/**
 * Konsolda görülmesi beklenen, uygulama hatası sayılmayan iletiler. Her girdinin nedeni yanında.
 */
const BENIGN_CONSOLE_ERRORS: RegExp[] = [
  // Tarayıcı, Supabase'in 4xx yanıtlarını (yanlış şifre, var olan e-posta…) "Failed to load resource"
  // olarak yazar; uygulama bunları Türkçe hata metnine çevirir, testler o metni ayrıca dener.
  /Failed to load resource: the server responded with a status of 4\d\d/,
];

export interface ConsoleGuard {
  /** Bekçiye ek bir sayfa (ikinci tarayıcı bağlamı) bağlar. */
  watch(page: Page, label?: string): void;
  /** Bu teste özel izin verilen ileti kalıbı. */
  allow(pattern: RegExp): void;
  errors(): string[];
}

function createConsoleGuard(): ConsoleGuard {
  const collected: string[] = [];
  const allowed = [...BENIGN_CONSOLE_ERRORS];
  const isAllowed = (text: string) => allowed.some((re) => re.test(text));
  return {
    watch(page, label = 'page') {
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (!isAllowed(text)) collected.push(`[${label}] console.error: ${text}`);
      });
      page.on('pageerror', (err) => {
        const text = `${err.name}: ${err.message}`;
        if (!isAllowed(text)) collected.push(`[${label}] pageerror: ${text}`);
      });
      // Alert.alert web'de window.confirm/alert olur; onaylanır (iptal yolu ayrıca denenmez).
      page.on('dialog', (dialog) => void dialog.accept().catch(() => undefined));
    },
    allow(pattern) {
      allowed.push(pattern);
    },
    errors() {
      return collected.filter((text) => !isAllowed(text));
    },
  };
}

type Fixtures = {
  consoleGuard: ConsoleGuard;
  /** Bu testin sınıf adı öneki (benzersiz); test sonunda bu önekli sınıflar silinir. */
  classPrefix: string;
};

export const test = base.extend<Fixtures>({
  consoleGuard: [
    async ({ page }, use, testInfo) => {
    const guard = createConsoleGuard();
    guard.watch(page);
    await use(guard);
    const errors = guard.errors();
    if (errors.length) {
      await testInfo.attach('console-errors', { body: errors.join('\n'), contentType: 'text/plain' });
    }
    expect(errors, 'Tarayıcı konsolunda beklenmeyen hata').toEqual([]);
    },
    // Her testte açık: konsol hatası olan test başarısız sayılır.
    { auto: true },
  ],
  classPrefix: async ({}, use) => {
    const prefix = `${CLASS_PREFIX} ${Date.now().toString(36)}`;
    await use(prefix);
    // Güvenlik ağı: test arayüzden silemediyse (ya da yarıda kaldıysa) kalıntı bırakmaz.
    await deleteClassesByPrefix(prefix);
  },
});

/** Görünür olan testID (expo-router önceki ekranları DOM'da gizli tutar). */
export function tid(scope: Page | Locator, id: string): Locator {
  return scope.getByTestId(id).filter({ visible: true });
}

export async function login(page: Page, account = testAccount()): Promise<void> {
  await page.goto('/');
  await expect(tid(page, 'login-screen').or(tid(page, 'classes-screen'))).toBeVisible({ timeout: 30_000 });
  if (await tid(page, 'classes-screen').isVisible()) return;
  await tid(page, 'login-email').fill(account.email);
  await tid(page, 'login-password').fill(account.password);
  await tid(page, 'login-submit').click();
  await expect(tid(page, 'classes-screen')).toBeVisible({ timeout: 30_000 });
}

export async function signOutFromClasses(page: Page): Promise<void> {
  await tid(page, 'classes-menu').click();
  await tid(page, 'classes-signout').click();
  await tid(page, 'classes-signout-confirm-confirm').click();
  await expect(tid(page, 'login-screen')).toBeVisible({ timeout: 15_000 });
}

/** Aynı hesapla açılmış ikinci, bağımsız tarayıcı bağlamı (ayrı localStorage/oturum). */
export async function openSecondClient(
  browser: Browser,
  guard: ConsoleGuard,
  label = 'B',
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  guard.watch(page, label);
  await login(page);
  return { context, page };
}

export function classRow(page: Page, name: string): Locator {
  return tid(page, 'classes-list').getByRole('button', { name: new RegExp(`^${escapeRegExp(name)},`) });
}

export function formRow(page: Page, title: string): Locator {
  return tid(page, 'class-screen').getByRole('button', { name: new RegExp(`^${escapeRegExp(title)},`) });
}

export interface WizardOptions {
  name: string;
  /** Yapıştırılan liste (satır başına bir ad). */
  students: string[];
  /** Varsayılan Yoklama'ya ek olarak seçilecek hazır formlar (ör. 'artieksi', 'odev'). */
  extraForms?: string[];
}

/** Sınıflarım'dan sihirbazla sınıf oluşturur; sınıf ekranında biter. */
export async function createClassViaWizard(page: Page, opts: WizardOptions): Promise<void> {
  await tid(page, 'classes-fab').or(tid(page, 'classes-empty-new')).click();
  await expect(tid(page, 'wizard-step-1')).toBeVisible();
  await tid(page, 'wizard-name-input').fill(opts.name);
  await tid(page, 'wizard-next').click();
  await expect(tid(page, 'wizard-step-2')).toBeVisible();
  await tid(page, 'collect-method-paste').click();
  await tid(page, 'collect-paste-input').fill(opts.students.join('\n'));
  await tid(page, 'collect-paste-add').click();
  for (const [i, student] of opts.students.entries()) {
    await expect(tid(page, `student-row-${i}-name`)).toHaveValue(student);
  }
  await tid(page, 'wizard-next').click();
  await expect(tid(page, 'wizard-step-3')).toBeVisible();
  for (const form of opts.extraForms ?? []) await tid(page, `wizard-form-${form}`).click();
  await tid(page, 'wizard-create').click();
  await expect(tid(page, 'class-students-row')).toBeVisible({ timeout: 30_000 });
  await expect(tid(page, 'class-screen')).toContainText(opts.name);
}

/** Açık sınıf ekranından "⋯ → Sınıfı sil → onay"; Sınıflarım'a döner. */
export async function deleteCurrentClass(page: Page, name: string): Promise<void> {
  await tid(page, 'class-more').click();
  await tid(page, 'class-menu-delete').click();
  await tid(page, 'class-delete-confirm-confirm').click();
  await expect(tid(page, 'classes-screen')).toBeVisible({ timeout: 20_000 });
  await expect(classRow(page, name)).toHaveCount(0);
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Seçenek düğmesinin (OptionChip / SegmentedChoice) seçili olup olmadığı. Bileşenler
 * accessibilityState'in yanında aria-checked de verir (react-native-web 0.21 yalnızca aria-*'yı
 * DOM'a yazar); ekran okuyucunun gördüğü bu öznitelik doğrulanır.
 */
export async function expectChosen(option: Locator, chosen = true): Promise<void> {
  await expect(option).toHaveAttribute('aria-checked', chosen ? 'true' : 'false');
}
