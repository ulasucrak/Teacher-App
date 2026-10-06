// Web E2E için ortam değişkenleri: E2E_ENV_FILE (varsayılan: proje kökündeki .env) okunur.
// Değerler yalnızca süreç ortamına yazılır; hiçbir zaman ekrana basılmaz.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export function loadEnvFile(file = process.env.E2E_ENV_FILE || resolve(root, '.env')) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    out[m[1]] = value;
  }
  // Zaten tanımlı değişkenler ezilmez.
  for (const [k, v] of Object.entries(out)) if (process.env[k] === undefined) process.env[k] = v;
  return out;
}
