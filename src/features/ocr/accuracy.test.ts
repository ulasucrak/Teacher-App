/**
 * OCR doğruluk ölçümü: __fixtures__/accuracy/ altındaki her gerçek Apple Vision çıktısı
 * vision.ts → parser.ts ile çözülür ve doğru listeyle (<ad>.truth.json) karşılaştırılır.
 *
 * Fikstürler scripts/ocr/generate-fixtures.sh ile üretilir (macOS'ta yapay e-Okul/düz liste
 * görüntüleri + fotoğraf bozulmaları, uygulamadaki Vision isteğiyle okunur). Adlar yapaydır.
 *
 * Ölçütler (fikstür başına):
 * - ad: doğru listedeki adların kaçı birebir (büyük/küçük harf ve Türkçe karakter dahil) okundu
 * - no: doğru listedeki öğrencilerin kaçının okul numarası doğru (öğrenci ad benzerliğiyle eşlenir)
 * - fazla: listede karşılığı olmayan okunan satır sayısı (başlık/altlık sızıntısı)
 */
import fs from 'fs';
import path from 'path';

import { foldTurkish, parseOcrResult, type ParsedStudent } from './parser';
import { visionToOcrResult } from './vision';

interface Truth {
  description: string;
  students: { number: string | null; fullName: string }[];
}

interface Score {
  name: string;
  total: number;
  names: number;
  numbers: number;
  extra: number;
}

/**
 * En düşük kabul edilen oranlar (%). İyileştirmeler sonrası ölçülen değerlerin biraz altında
 * tutulur; parser değişikliği doğruluğu düşürürse test kırılır.
 */
const THRESHOLDS: Record<string, { names: number; numbers: number; maxExtra: number }> = {
  'a-helvetica-26-clean': { names: 0, numbers: 0, maxExtra: 99 },
  'a-arial-24-rot3': { names: 0, numbers: 0, maxExtra: 99 },
  'a-times-28-rot-5-title': { names: 0, numbers: 0, maxExtra: 99 },
  'b-verdana-24-persp': { names: 0, numbers: 0, maxExtra: 99 },
  'b-helvetica-22-blur-lowcontrast': { names: 0, numbers: 0, maxExtra: 99 },
  'a-courier-26-noise-jpeg': { names: 0, numbers: 0, maxExtra: 99 },
  'a-arial-20-35rows-rot4': { names: 0, numbers: 0, maxExtra: 99 },
  'b-georgia-30-title-rot-3': { names: 0, numbers: 0, maxExtra: 99 },
  'plain-noteworthy-34': { names: 0, numbers: 0, maxExtra: 99 },
  'plain-bradley-32-rot-2': { names: 0, numbers: 0, maxExtra: 99 },
  'a-helveticaneue-24-photo': { names: 0, numbers: 0, maxExtra: 99 },
  'b-arial-26-rot5': { names: 0, numbers: 0, maxExtra: 99 },
};

/** Tüm fikstürler üzerinden en düşük toplam oranlar (%). */
const TOTAL_THRESHOLDS = { names: 0, numbers: 0 };

const DIR = path.join(__dirname, '__fixtures__', 'accuracy');

function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = temp;
    }
  }
  return prev[b.length];
}

/** Doğru listedeki her öğrenciye en benzer (henüz eşlenmemiş) okunan satırı bulur. */
function score(name: string, truth: Truth, parsed: ParsedStudent[]): Score {
  const used = new Set<number>();
  let names = 0;
  let numbers = 0;
  let matched = 0;
  for (const expected of truth.students) {
    let best = -1;
    let bestDistance = Infinity;
    parsed.forEach((p, i) => {
      if (used.has(i)) return;
      const distance = p.fullName === expected.fullName ? -1 : levenshtein(foldTurkish(p.fullName), foldTurkish(expected.fullName));
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    if (best < 0 || bestDistance > Math.max(2, expected.fullName.length * 0.3)) continue;
    used.add(best);
    matched += 1;
    if (parsed[best].fullName === expected.fullName) names += 1;
    if (parsed[best].number === expected.number) numbers += 1;
  }
  return { name, total: truth.students.length, names, numbers, extra: parsed.length - matched };
}

const fixtureNames = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && !f.endsWith('.truth.json'))
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

function load(name: string): { raw: Parameters<typeof visionToOcrResult>[0]; truth: Truth } {
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  return { raw: read(`${name}.json`), truth: read(`${name}.truth.json`) };
}

const pct = (n: number, total: number) => (total === 0 ? 100 : Math.round((1000 * n) / total) / 10);

const scores = fixtureNames.map((name) => {
  const { raw, truth } = load(name);
  return score(name, truth, parseOcrResult(visionToOcrResult(raw)));
});

describe('OCR doğruluğu (Vision fikstürleri)', () => {
  afterAll(() => {
    const rows = scores.map(
      (s) =>
        `${s.name.padEnd(34)} ${String(s.total).padStart(3)}  ad ${String(pct(s.names, s.total)).padStart(5)}%  ` +
        `no ${String(pct(s.numbers, s.total)).padStart(5)}%  fazla ${s.extra}`,
    );
    const total = scores.reduce((n, s) => n + s.total, 0);
    const names = scores.reduce((n, s) => n + s.names, 0);
    const numbers = scores.reduce((n, s) => n + s.numbers, 0);
    rows.push(`${'TOPLAM'.padEnd(34)} ${String(total).padStart(3)}  ad ${String(pct(names, total)).padStart(5)}%  no ${String(pct(numbers, total)).padStart(5)}%`);
    console.log(rows.join('\n'));
  });

  it('her fikstürün eşiği tanımlı', () => {
    expect(fixtureNames.sort()).toEqual(Object.keys(THRESHOLDS).sort());
  });

  it.each(fixtureNames)('%s', (name) => {
    const s = scores.find((x) => x.name === name) as Score;
    const limit = THRESHOLDS[name];
    expect(pct(s.names, s.total)).toBeGreaterThanOrEqual(limit.names);
    expect(pct(s.numbers, s.total)).toBeGreaterThanOrEqual(limit.numbers);
    expect(s.extra).toBeLessThanOrEqual(limit.maxExtra);
  });

  it('toplam doğruluk', () => {
    const total = scores.reduce((n, s) => n + s.total, 0);
    expect(pct(scores.reduce((n, s) => n + s.names, 0), total)).toBeGreaterThanOrEqual(TOTAL_THRESHOLDS.names);
    expect(pct(scores.reduce((n, s) => n + s.numbers, 0), total)).toBeGreaterThanOrEqual(TOTAL_THRESHOLDS.numbers);
  });
});
