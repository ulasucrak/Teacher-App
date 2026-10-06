/**
 * Gerçek Apple Vision çıktısıyla uçtan uca kontrol (vision.ts → parser.ts).
 *
 * __fixtures__/vision-eokul-*.json: macOS'ta AppKit ile çizilmiş 2000x2828 piksellik e-Okul
 * tarzı sınıf listesi (başlıklar, "S.No | Okul No | Adı Soyadı | Cinsiyet", 10 satır, altlık),
 * modules/vision-text-recognition/ios/VisionTextReader.swift ile aynı istekle okundu
 * (.accurate, tr-TR, dil düzeltmesi açık). Yerel modülün döndürdüğü biçimdedir.
 */
import title30 from './__fixtures__/vision-eokul-title-30px.json';
import upper22 from './__fixtures__/vision-eokul-upper-22px.json';
import upper30 from './__fixtures__/vision-eokul-upper-30px.json';
import { parseOcrResult } from './parser';
import { visionToOcrResult } from './vision';

const expected = [
  { number: '112', fullName: 'Selin Bayezit' },
  { number: '245', fullName: 'Mehmet Kara' },
  { number: '318', fullName: 'Işıl Doğan' },
  { number: '402', fullName: 'İbrahim Çelik' },
  { number: '517', fullName: 'Ömer Güneş' },
  { number: '623', fullName: 'Ayşe Nur Yıldız' },
  { number: '734', fullName: 'Çağrı Şahin' },
  { number: '845', fullName: 'Ümit Irmak Öztürk' },
  { number: '956', fullName: 'İrem Akgül' },
  { number: '1067', fullName: 'Ilgaz Erdoğan' },
];

function parse(raw: unknown) {
  return parseOcrResult(visionToOcrResult(raw as Parameters<typeof visionToOcrResult>[0]));
}

describe('Vision fikstürleri → parser', () => {
  it('küçük yazılı BÜYÜK HARF listeyi eksiksiz okur (22 px)', () => {
    expect(parse(upper22).map(({ number, fullName }) => ({ number, fullName }))).toEqual(expected);
  });

  it.each([
    ['BÜYÜK HARF, 30 px', upper30],
    ['Başlık düzeni, 30 px', title30],
  ])('%s: başlık/altlık atılır, tüm okul numaraları doğru, adların çoğu doğru', (_name, raw) => {
    const students = parse(raw);
    expect(students.map((s) => s.number)).toEqual(expected.map((s) => s.number));
    const correct = students.filter((s, i) => s.fullName === expected[i].fullName).length;
    // Bilinen Vision hataları: kelime başındaki "İ" noktası (Ibrahim, Irem) ve "Ğ" → "G".
    expect(correct).toBeGreaterThanOrEqual(7);
  });

  it('S.No "1" okunmasa da ilk satırın okul numarası korunur (30 px)', () => {
    const texts = upper30.observations.map((o) => o.text);
    expect(texts).not.toContain('1');
    expect(parse(upper30)[0]).toMatchObject({ number: '112', fullName: 'Selin Bayezit' });
  });
});
