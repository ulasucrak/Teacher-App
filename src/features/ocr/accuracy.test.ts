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
 *
 * 12 fikstür, 346 öğrenci. Önce → sonra (O02): ad 70.2% → 97.4%, okul no 33.8% → 99.7%.
 * W01: düşmüş baş "İ" yalnızca düşük güven / aday desteğiyle → ad 96.8%.
 * Katkılar (her biri kapatılınca): eğim düzeltme yoksa no 34.4%; sözlük yoksa ad 75.1%;
 * Vision adayları yoksa ad 95.4%. Kalan hatalar: bilerek sözlüğe konmamış soyadlar
 * (Çağlayık, Dağdelen, Şimşekler) ve el yazısı benzeri fontta harf karışıklıkları.
 * Ayrıntı: OCR_ACCURACY_DETAIL=1 (yanlışlar), OCR_ACCURACY_ROWS=<fikstür> (görsel satırlar).
 */
import fs from 'fs';
import path from 'path';

import { foldTurkish, groupIntoRows, parseOcrResult, type ParsedStudent } from './parser';
import { isLowConfidence } from './review';
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
  /** review.ts'in "düşük güven" diye işaretleyeceği satır sayısı (doğru / yanlış okunmuş). */
  lowRight: number;
  lowWrong: number;
}

/**
 * En düşük kabul edilen oranlar (%). İyileştirmeler sonrası ölçülen değerlerin biraz altında
 * tutulur; parser değişikliği doğruluğu düşürürse test kırılır.
 */
const THRESHOLDS: Record<string, { names: number; numbers: number; maxExtra: number }> = {
  'a-arial-20-35rows-rot4': { names: 95, numbers: 92, maxExtra: 1 },
  'a-arial-24-rot3': { names: 95, numbers: 95, maxExtra: 1 },
  'a-courier-26-noise-jpeg': { names: 91, numbers: 95, maxExtra: 1 },
  'a-helvetica-26-clean': { names: 88, numbers: 95, maxExtra: 1 },
  'a-helveticaneue-24-photo': { names: 95, numbers: 95, maxExtra: 1 },
  'a-times-28-rot-5-title': { names: 95, numbers: 95, maxExtra: 1 },
  'b-arial-26-rot5': { names: 95, numbers: 95, maxExtra: 1 },
  'b-georgia-30-title-rot-3': { names: 95, numbers: 95, maxExtra: 1 },
  // Vision "İSMAİL"/"IŞIL" baş harfini güven 1 ile atlıyor; düşmüş baş İ yalnızca düşük güvenli
  // ya da adayların desteklediği satırda geri getirildiği için (yanlış "İpek"/"İrem" olmasın) 91.2%.
  'b-helvetica-22-blur-lowcontrast': { names: 88, numbers: 95, maxExtra: 1 },
  'b-verdana-24-persp': { names: 95, numbers: 95, maxExtra: 1 },
  'plain-bradley-32-rot-2': { names: 76, numbers: 95, maxExtra: 1 },
  'plain-noteworthy-34': { names: 90, numbers: 95, maxExtra: 1 },
};

/** Tüm fikstürler üzerinden en düşük toplam oranlar (%). */
const TOTAL_THRESHOLDS = { names: 95, numbers: 97 };

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
  const misses: string[] = [];
  let names = 0;
  let numbers = 0;
  let matched = 0;
  let lowRight = 0;
  let lowWrong = 0;
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
    if (best < 0 || bestDistance > Math.max(2, expected.fullName.length * 0.3)) {
      misses.push(`  eksik: ${expected.number ?? '-'} ${expected.fullName}`);
      continue;
    }
    used.add(best);
    matched += 1;
    const got = parsed[best];
    if (got.fullName === expected.fullName) names += 1;
    if (got.number === expected.number) numbers += 1;
    if (isLowConfidence(got)) {
      if (got.fullName === expected.fullName && got.number === expected.number) lowRight += 1;
      else lowWrong += 1;
    }
    if (got.fullName !== expected.fullName || got.number !== expected.number) {
      misses.push(`  ${expected.number ?? '-'} ${expected.fullName}  ←  ${got.number ?? '-'} ${got.fullName} (${got.confidence ?? '?'})`);
    }
  }
  parsed.forEach((p, i) => {
    if (!used.has(i)) misses.push(`  fazla: ${p.number ?? '-'} ${p.fullName}`);
  });
  // Ayrıntı: OCR_ACCURACY_DETAIL=1 npx jest accuracy
  if (process.env.OCR_ACCURACY_DETAIL && misses.length > 0) console.log(`${name}\n${misses.join('\n')}`);
  return { name, total: truth.students.length, names, numbers, extra: parsed.length - matched, lowRight, lowWrong };
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
  // Görsel satırlar: OCR_ACCURACY_ROWS=<fikstür adı> npx jest accuracy
  if (process.env.OCR_ACCURACY_ROWS === name) {
    console.log(groupIntoRows(visionToOcrResult(raw)).map((cells) => cells.join(' | ')).join('\n'));
  }
  return score(name, truth, parseOcrResult(visionToOcrResult(raw)));
});

describe('OCR doğruluğu (Vision fikstürleri)', () => {
  afterAll(() => {
    const rows = scores.map(
      (s) =>
        `${s.name.padEnd(34)} ${String(s.total).padStart(3)}  ad ${String(pct(s.names, s.total)).padStart(5)}%  ` +
        `no ${String(pct(s.numbers, s.total)).padStart(5)}%  fazla ${s.extra}  düşük güven ${s.lowWrong} yanlış / ${s.lowRight} doğru`,
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
