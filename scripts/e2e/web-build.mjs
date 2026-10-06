#!/usr/bin/env node
// Web sürümünü E2E için derler (expo export -p web → dist/).
// Ortam: E2E_ENV_FILE (varsayılan .env) içindeki EXPO_PUBLIC_* değişkenleri derlemeye verilir.
import { spawnSync } from 'node:child_process';
import { loadEnvFile, root } from './web-env.mjs';

loadEnvFile();
for (const key of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']) {
  if (!process.env[key]) {
    console.error(`${key} tanımlı değil (.env ya da E2E_ENV_FILE).`);
    process.exit(1);
  }
}
const res = spawnSync('npx', ['expo', 'export', '-p', 'web', '--clear'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, CI: '1' },
});
process.exit(res.status ?? 1);
