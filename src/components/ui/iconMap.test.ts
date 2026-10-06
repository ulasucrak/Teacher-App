import fs from 'fs';
import path from 'path';

import { extraIcons } from '@/features/forms/components/formIconMap';

import { icons, toWebSymbol, type SymbolName } from './iconMap';

const SRC = path.resolve(__dirname, '../..');

/** Material Symbols adı → kod noktası (expo-symbols'ün web/Android'de kullandığı tablo). */
function materialSymbols(): Record<string, number> {
  const buildDir = path.dirname(require.resolve('expo-symbols'));
  return JSON.parse(fs.readFileSync(path.join(buildDir, 'android', 'symbols.json'), 'utf8'));
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__fixtures__' ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

const allMaps: Record<string, SymbolName> = { ...icons, ...extraIcons };

describe('web icon mapping', () => {
  const material = materialSymbols();

  it.each(Object.entries(allMaps))('%s has a Material Symbols glyph on web', (_key, symbol) => {
    const web = toWebSymbol(symbol).web;
    expect(web).toBeTruthy();
    expect(material[web as string]).toEqual(expect.any(Number));
  });

  it('keeps the iOS and Android names when adding the web name', () => {
    expect(toWebSymbol({ ios: 'pencil', android: 'edit' })).toEqual({ ios: 'pencil', android: 'edit', web: 'edit' });
  });

  it('maps every SF Symbol name used in src', () => {
    const mapped = new Set(Object.values(allMaps).map((s) => s.ios));
    const used = new Set<string>();
    for (const file of sourceFiles(SRC)) {
      for (const match of fs.readFileSync(file, 'utf8').matchAll(/\{\s*ios:\s*'([^']+)',\s*android:\s*'/g)) used.add(match[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((name) => !mapped.has(name))).toEqual([]);
  });
});
