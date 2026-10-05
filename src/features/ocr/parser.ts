/**
 * ML Kit metin tanıma çıktısından öğrenci listesi çıkarır. Saf modül: yerel modül,
 * ağ ya da React bağımlılığı yok (testler bu dosyayı doğrudan çalıştırır).
 *
 * Desteklenen biçimler:
 * - e-Okul sınıf listesi: "S.No | Okul No | Adı Soyadı | Cinsiyet" (+ başlık/altlık satırları).
 *   ML Kit tablo sütunlarını çoğu zaman ayrı bloklar olarak okur; satırlar dikey konuma
 *   göre yeniden birleştirilir.
 * - Düz liste (el yazısı / daktilo): satır başına bir ad, isteğe bağlı numara
 *   ("12. Ali Veli", "12 - Ali Veli", "512 Ali Veli").
 */

import { normalizeStudentName } from '@/features/students/name';

// ---------------------------------------------------------------------------
// Girdi tipleri (ML Kit `TextRecognitionResult` ile yapısal olarak uyumlu)
// ---------------------------------------------------------------------------

export interface OcrFrame {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface OcrLine {
  text: string;
  frame?: OcrFrame;
}

export interface OcrBlock {
  text?: string;
  lines: OcrLine[];
}

export interface OcrResult {
  text?: string;
  blocks: OcrBlock[];
}

// ---------------------------------------------------------------------------
// Çıktı tipleri
// ---------------------------------------------------------------------------

/** Düşük güven nedeni: öğretmenin satırı kontrol etmesi gerekir. */
export type NameWarning = 'short' | 'digits' | 'singleWord';

export interface ParsedStudent {
  /** Okul numarası (yalnızca rakam) ya da bilinmiyorsa null. */
  number: string | null;
  /** Türkçe başlık düzeninde ad soyad: "Selin Bayezit". */
  fullName: string;
  warnings: NameWarning[];
}

// ---------------------------------------------------------------------------
// Türkçe metin yardımcıları
// ---------------------------------------------------------------------------

const LOCALE = 'tr-TR';

/** Karşılaştırma anahtarı: Türkçe küçük harf, aksansız, tek boşluk. */
export function foldTurkish(value: string): string {
  return value
    .toLocaleLowerCase(LOCALE)
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[îí]/g, 'i')
    .replace(/[âá]/g, 'a')
    .replace(/[ûú]/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * "SELİN BAYEZİT" → "Selin Bayezit", "ışık" → "Işık" (tr-TR kurallarıyla).
 * Elle eklenen öğrencilerle aynı biçim olsun diye öğrenci adı düzenleyicisini kullanır.
 */
export const toTurkishTitleCase: (value: string) => string = normalizeStudentName;

/** Ad alanı için düşük güven nedenleri (düzenlenen satırlarda da yeniden hesaplanır). */
export function assessName(fullName: string, hadDigits = false): NameWarning[] {
  const warnings: NameWarning[] = [];
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const letters = fullName.replace(/[^\p{L}]/gu, '').length;
  if (hadDigits || /\d/.test(fullName)) warnings.push('digits');
  if (letters < 5 || words.some((w) => w.replace(/[^\p{L}]/gu, '').length < 2)) warnings.push('short');
  if (words.length === 1) warnings.push('singleWord');
  return warnings;
}

// ---------------------------------------------------------------------------
// Satır gruplama
// ---------------------------------------------------------------------------

interface PositionedLine {
  text: string;
  top: number;
  left: number;
  height: number;
  centerY: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Satırları dikey merkezlerine göre görsel satırlara toplar; her satırın hücreleri
 * soldan sağa sıralanır. Konum bilgisi yoksa ML Kit sırası korunur.
 */
export function groupIntoRows(result: OcrResult): string[][] {
  const lines = result.blocks.flatMap((b) => b.lines).filter((l) => l.text.trim().length > 0);
  if (lines.length === 0) return [];

  const allFramed = lines.every((l) => l.frame && l.frame.height > 0);
  if (!allFramed) return lines.map((l) => [l.text]);

  const positioned: PositionedLine[] = lines.map((l) => {
    const f = l.frame as OcrFrame;
    return { text: l.text, top: f.top, left: f.left, height: f.height, centerY: f.top + f.height / 2 };
  });
  // Aynı satırdaki sütunlar: merkezler yarım satır yüksekliğinden yakınsa birleşir.
  const tolerance = Math.max(median(positioned.map((p) => p.height)) * 0.5, 2);

  positioned.sort((a, b) => a.centerY - b.centerY || a.left - b.left);

  const rows: { centerY: number; members: PositionedLine[] }[] = [];
  for (const line of positioned) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(line.centerY - current.centerY) <= tolerance) {
      current.members.push(line);
      current.centerY = current.members.reduce((sum, m) => sum + m.centerY, 0) / current.members.length;
    } else {
      rows.push({ centerY: line.centerY, members: [line] });
    }
  }
  return rows.map((r) => [...r.members].sort((a, b) => a.left - b.left).map((m) => m.text));
}

// ---------------------------------------------------------------------------
// Başlık / gürültü tanıma
// ---------------------------------------------------------------------------

/** Aksansız küçük harfle başlık kelimeleri: bunlardan biri geçen satır öğrenci değildir. */
const HEADER_WORDS = new Set([
  'tc',
  'milli',
  'egitim',
  'ogretim',
  'bakanligi',
  'mudurlugu',
  'mudurlu',
  'mudur',
  'kaymakamligi',
  'valiligi',
  'baskanligi',
  'lisesi',
  'ortaokulu',
  'ilkokulu',
  'okulu',
  'koleji',
  'okul',
  'sinif',
  'sinifi',
  'listesi',
  'liste',
  'listede',
  'ogretmen',
  'ogretmeni',
  'ogretmenin',
  'rehber',
  'sube',
  'subesi',
  'ogrenci',
  'ogrencinin',
  'ogrencisi',
  'cinsiyet',
  'cinsiyeti',
  'adi',
  'soyadi',
  'ad',
  'soyad',
  'adsoyad',
  'no',
  'numara',
  'numarasi',
  'sno',
  'sira',
  'sayfa',
  'tarih',
  'tarihi',
  'yili',
  'donem',
  'donemi',
  'imza',
  'toplam',
  'eokul',
  'mebbis',
  'bulunmaktadir',
]);

const DATE_RE = /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/;
const YEAR_RANGE_RE = /\b(19|20)\d{2}\s*[-–/]\s*(19|20)\d{2}\b/;

function isHeaderRow(rowText: string): boolean {
  if (DATE_RE.test(rowText) || YEAR_RANGE_RE.test(rowText)) return true;
  // "T.C." / "S.No" / "e-Okul" gibi noktalı/tireli kısaltmaları tek kelimeye indir.
  const folded = foldTurkish(rowText).replace(/(\p{L})[.\-](?=\p{L})/gu, '$1');
  const words = folded.split(/[^\p{L}]+/u).filter(Boolean);
  return words.some((w) => HEADER_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Satır çözümleme
// ---------------------------------------------------------------------------

const GENDER_WORDS = new Set(['kiz', 'erkek', 'k', 'e']);

/** OCR karışıklıklarını düzeltip rakam dizisi döndürür; sayı değilse null. */
function asNumber(token: string): string | null {
  const stripped = token.replace(/^[(\[]+/, '').replace(/[.)\]:,\-]+$/, '');
  if (!/\d/.test(stripped)) return null;
  if (!/^[\dOoIl]+$/.test(stripped)) return null;
  return stripped.replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
}

const DIGIT_TO_LETTER: Record<string, string> = { '0': 'O', '1': 'I', '5': 'S', '8': 'B' };

interface NameToken {
  text: string;
  hadDigits: boolean;
}

const TR_UPPER_DOTTED_I = 'İ';
const VOWELS_RE = /[AEIİOÖUÜ]/g;

/**
 * BÜYÜK HARF kelimede ASCII "I" → "İ" (ML Kit "İ"nin noktasını çoğu zaman kaçırır):
 * "SELIN" → "SELİN", "ILKER" → "İLKER".
 *
 * Ödünleşim: gerçek "ı" içeren kelimeler de büyük harfte "I" olarak gelir ("IŞIK", "KILIÇ",
 * "YILMAZ"). Ayırt etmenin kesin yolu yok; "İ" tercih edilir, şu durumlar hariç:
 * - Fotoğrafın geri kalanında "İ" okunmuşsa (`dotAware`) OCR noktaları görüyordur; "I" gerçekten "ı"dır.
 * - Kelimenin tüm ünlüleri "I" ise ("KILIÇ", "IŞIK", "YILDIZ") büyük olasılıkla "ı"dır.
 * - Kelimenin tek harfi "I" ise dokunulmaz.
 * Yanlış kalan adları ("Yilmaz") öğretmen inceleme listesinde düzeltir.
 */
function restoreDottedI(text: string, dotAware: boolean): string {
  if (dotAware || !text.includes('I')) return text;
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2 || letters !== letters.toLocaleUpperCase(LOCALE)) return text;
  const vowels = letters.match(VOWELS_RE) ?? [];
  if (vowels.length > 0 && vowels.every((v) => v === 'I')) return text;
  return text.replace(/I/g, TR_UPPER_DOTTED_I);
}

/** Ad kelimesindeki OCR karışıklıklarını düzeltir: "Y1LMAZ" → "YILMAZ", "lŞIK" → "IŞIK". */
function cleanNameToken(token: string, dotAware = true): NameToken | null {
  let text = token.replace(/[^\p{L}\d'’\-.]/gu, '').replace(/^[-'.’]+|[-'’]+$/g, '');
  // Tek harf + nokta baş harftir ("M."), diğer noktalar gürültü.
  if (!/^\p{L}\.$/u.test(text)) text = text.replace(/\./g, '');
  if (!text) return null;
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length === 0) return null;

  let hadDigits = false;
  if (/\d/.test(text)) {
    // Harf yoğun kelimedeki rakamlar okuma hatasıdır; diğer rakamlar atılır.
    hadDigits = true;
    const upperish = letters === letters.toLocaleUpperCase(LOCALE);
    text = text.replace(/\d/g, (d) => {
      const mapped = DIGIT_TO_LETTER[d];
      if (!mapped) return '';
      return d === '1' && !upperish ? 'l' : mapped;
    });
  }

  const nonL = text.replace(/l/g, '');
  const nonLLetters = nonL.replace(/[^\p{L}]/gu, '');
  if (nonLLetters.length > 0 && nonLLetters === nonLLetters.toLocaleUpperCase(LOCALE)) {
    // BÜYÜK HARF kelimede küçük "l", büyük "I" olarak okunmuş demektir.
    text = text.replace(/l/g, 'I');
  } else if (/\p{Ll}/u.test(text)) {
    // Küçük harf kelimenin ortasındaki "I" aslında "l": "SeIin" → "Selin".
    text = text.replace(/(?<=\p{Ll})I|I(?=\p{Ll}{2})(?<!^I)/gu, 'l');
  }
  return { text: restoreDottedI(text, dotAware), hadDigits };
}

interface RawRow {
  /** Addan önceki sayılar (sıra no, okul no). */
  numbers: string[];
  /** Addan sonraki sayılar ("S.No | Adı Soyadı | Okul No" düzeni). */
  trailingNumbers: string[];
  /** İlk sayının ardından "." ")" "-" geldi mi (düz listede sıra numarası işareti). */
  punctuatedLead: boolean;
  nameTokens: NameToken[];
}

function tokenize(cells: string[]): string[] {
  return (
    cells
      .join(' ')
      // Tablo çizgisi okunan dikey çubuklar ve benzeri ayraçlar.
      .replace(/[|¦│┃\[\]{}_=*•·]/g, ' ')
      // "12.Ali" / "12-Ali" → "12. Ali"
      .replace(/(\d)([.)\-:])(?=\p{L})/gu, '$1$2 ')
      // "245AYŞE" → "245 AYŞE" (en az iki rakam + en az iki harf)
      .replace(/(?<![\p{L}\d])(\d{2,})(?=\p{L}{2,})/gu, '$1 ')
      .split(/\s+/)
      // Tek başına "I", "l", "!" tablo çizgisinin okunmuş hâlidir.
      .filter((t) => t.length > 0 && !/^[Il!]$/.test(t))
  );
}

function parseRow(cells: string[], dotAware: boolean): RawRow | null {
  const rowText = cells.join(' ');
  if (DATE_RE.test(rowText) || YEAR_RANGE_RE.test(rowText)) return null;

  const numbers: string[] = [];
  const trailingNumbers: string[] = [];
  const nameTokens: NameToken[] = [];
  let punctuatedLead = false;

  const tokens = tokenize(cells);
  tokens.forEach((token, index) => {
    const num = asNumber(token);
    if (num !== null) {
      if (numbers.length === 0 && nameTokens.length === 0) {
        const next = tokens[index + 1];
        punctuatedLead = /[.)\-:]$/.test(token) || next === '-' || next === '.' || next === ')';
      }
      if (nameTokens.length === 0) numbers.push(num);
      else trailingNumbers.push(num);
      return;
    }
    const cleaned = cleanNameToken(token, dotAware);
    if (cleaned) nameTokens.push(cleaned);
  });

  // Başlık sözcükleri yalnızca numarasız satırlarda aranır: "1 245 MEHMET ALİ SIRA" bir öğrencidir.
  if (numbers.length === 0 && isHeaderRow(rowText)) return null;

  const isGender = (t: NameToken) => GENDER_WORDS.has(foldTurkish(t.text));
  // Sondaki cinsiyet sütunu ("Kız", "Erkek", "K", "E"): en fazla bir kelime atılır.
  if (nameTokens.length > 0 && isGender(nameTokens[nameTokens.length - 1])) nameTokens.pop();
  // Yalnızca cinsiyet kelimelerinden oluşan satır özet satırıdır ("Erkek: 15 Kız: 17").
  if (nameTokens.every(isGender)) return null;

  const letterCount = nameTokens.reduce((n, t) => n + t.text.replace(/[^\p{L}]/gu, '').length, 0);
  if (letterCount < 2) return null;
  return { numbers, trailingNumbers, punctuatedLead, nameTokens };
}

/**
 * Tek baştaki sayı sıra numarası mı okul numarası mı?
 * - Tablonun çoğunda iki baştaki sayı varsa (S.No + Okul No) tek sayı sıra numarasıdır.
 * - Tek sayılar ardışık artıyorsa (1, 2, 3 … ya da ikinci sayfada 33, 34, 35 …) sıra numarasıdır.
 * - Tek satırlık listede 1 ya da "12." gibi işaretliyse sıra numarasıdır.
 */
function singleNumbersAreOrdinals(rows: RawRow[]): boolean {
  const singles = rows.filter((r) => r.numbers.length === 1);
  if (singles.length === 0) return false;
  const doubles = rows.filter((r) => r.numbers.length >= 2).length;
  if (doubles > singles.length) return true;

  const values = singles.map((r) => Number(r.numbers[0]));
  if (singles.length === 1) return values[0] === 1 || singles[0].punctuatedLead;

  let steps = 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] === values[i - 1] + 1) steps += 1;
  }
  return steps / (values.length - 1) >= 0.6;
}

/** Satırın okul numarası (yoksa null). */
function schoolNumberOf(row: RawRow, singlesAreOrdinals: boolean): string | null {
  // İlk sayı sıra no; sonuncusu okul no (aradaki çizgi "1" okunmuş olabilir).
  if (row.numbers.length >= 2) return row.numbers[row.numbers.length - 1];
  if (row.numbers.length === 1 && !singlesAreOrdinals) return row.numbers[0];
  // Baştaki sayı sıra no ya da hiç yok: okul no adın sağındaki sütunda olabilir.
  return row.trailingNumbers.length === 1 ? row.trailingNumbers[0] : null;
}

function keyOf(student: ParsedStudent): string {
  return `${student.number ?? ''}|${foldTurkish(student.fullName)}`;
}

/** Görsel satırlardan (hücre listeleri) öğrenci listesi üretir. */
export function parseRows(rows: string[][]): ParsedStudent[] {
  // Fotoğrafın herhangi bir yerinde "İ" okunduysa OCR noktaları ayırt ediyordur.
  const dotAware = rows.some((cells) => cells.some((c) => c.includes('İ')));
  const raw = rows.map((cells) => parseRow(cells, dotAware)).filter((r): r is RawRow => r !== null);
  const singlesAreOrdinals = singleNumbersAreOrdinals(raw);

  const seen = new Set<string>();
  const students: ParsedStudent[] = [];
  for (const row of raw) {
    const number = schoolNumberOf(row, singlesAreOrdinals);

    const fullName = toTurkishTitleCase(row.nameTokens.map((t) => t.text).join(' '));
    const hadDigits = row.nameTokens.some((t) => t.hadDigits);
    const student: ParsedStudent = { number, fullName, warnings: assessName(fullName, hadDigits) };

    const key = keyOf(student);
    if (seen.has(key)) continue;
    seen.add(key);
    students.push(student);
  }
  return students;
}

/** ML Kit sonucunu öğrenci listesine çevirir. */
export function parseOcrResult(result: OcrResult): ParsedStudent[] {
  return parseRows(groupIntoRows(result));
}

/** Konum bilgisi olmayan düz metin (satır başına bir öğrenci). */
export function parsePlainText(text: string): ParsedStudent[] {
  return parseRows(
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => [l]),
  );
}
