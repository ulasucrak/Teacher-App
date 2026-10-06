// Web sürümünün uçtan uca testleri (Playwright). Ayrıntı: README "E2E (web)".
import { defineConfig, devices } from '@playwright/test';

import { loadE2eEnv } from './e2e-web/support/env';

loadE2eEnv();

const port = Number(process.env.E2E_WEB_PORT || 8099);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;
// Varsayılan: kurulu Google Chrome. E2E_CHANNEL=chromium → `npx playwright install chromium` ile gelen tarayıcı.
const channel = process.env.E2E_CHANNEL === 'chromium' ? undefined : process.env.E2E_CHANNEL || 'chrome';
const build = process.env.E2E_SKIP_BUILD ? '' : 'node scripts/e2e/web-build.mjs && ';

export default defineConfig({
  testDir: 'e2e-web',
  // Testler aynı uzak Supabase hesabını paylaşır: sırayla çalışır.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './e2e-web/global-setup.ts',
  use: {
    baseURL,
    locale: 'tr-TR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `${build}node scripts/e2e/web-serve.mjs ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 600_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
});
