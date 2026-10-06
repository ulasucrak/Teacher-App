// Web E2E ortamı: E2E_ENV_FILE (varsayılan: proje kökündeki .env) okunur; tanımlı değişkenler ezilmez.
// Değerler hiçbir zaman ekrana basılmaz.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const projectRoot = resolve(__dirname, '../..');

export function loadE2eEnv(file = process.env.E2E_ENV_FILE || resolve(projectRoot, '.env')): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

/** Akışların kullandığı sabit test hesabı (Maestro akışlarıyla aynı varsayılan). */
export function testAccount(): { email: string; password: string } {
  return {
    email: process.env.EMAIL || 'e2e+u02@sinifdefteri.test',
    password: process.env.PASSWORD || 'Test1234!',
  };
}

export function supabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı değil (.env ya da E2E_ENV_FILE).');
  }
  return { url, anonKey };
}
