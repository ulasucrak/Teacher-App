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

import { asciiFoldLower, dictionarySpellings, isKnownDotlessName } from './trNames';

// ---------------------------------------------------------------------------
// Girdi tipleri (ML Kit `TextRecognitionResult` ile yapısal olarak uyumlu)
// ---------------------------------------------------------------------------

export interface OcrFrame {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface OcrPoint {
  x: number;
  y: number;
}

/** Aynı satırın başka bir okuması (Vision `topCandidates`). */
export interface OcrCandidate {
  text: string;
  /** 0...1 */
  confidence: number;
}

export interface OcrLine {
  text: string;
  frame?: OcrFrame;
  /** Satırın dörtgeni (piksel, sol-üst orijin): sol-üst, sağ-üst, sağ-alt, sol-alt (ML Kit ile aynı). */
  cornerPoints?: readonly OcrPoint[];
  /** Okuma güveni 0...1 (Vision verir; ML Kit vermez). */
  confidence?: number;
  /** En iyi ilk okumalar (ilki `text`); parser sözlüğe en uyanı seçer. */
  candidates?: readonly OcrCandidate[];
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
  /**
   * Satırın ad (ve okul no) hücrelerinin en düşük okuma güveni, 0...1. Yalnızca OCR güven
   * bildirdiğinde (Vision) vardır; review.ts düşük güvenli satırı işaretler.
   */
  confidence?: number;
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

/** Görsel satırın bir hücresi: okunan metin ve (varsa) okuma güveni. */
export interface RowCell {
  text: string;
  confidence?: number;
  /** OCR'ın aynı satır için diğer aday okumaları (Vision `topCandidates`). */
  alternates?: readonly string[];
}

/**
 * Ayrıştırma seçenekleri. `ocr: true` (fotoğraf) OCR karışıklıklarını düzeltir: rakam → harf,
 * "l"/"I", sözlükle Türkçe harf geri getirme, "I" → "İ" ve (düşük güvenli ya da adayların
 * desteklediği satırlarda) düşmüş baş "İ". `ocr: false` (yapıştırılan / yazılan metin) yazılanı
 * korur; yalnızca başlık düzenine çevirir.
 */
export interface ParseOptions {
  ocr?: boolean;
}

/** Bu güvenin altındaki satırlarda düşmüş baş "İ" geri getirilir (review'daki eşikle aynı). */
const DROPPED_I_MAX_CONFIDENCE = 0.6;

interface PositionedLine {
  cell: RowCell;
  left: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))];
}

/** Denenecek en büyük eğim (dy/dx): tan(7°) ≈ 0.123. */
const MAX_SKEW_SLOPE = 0.123;
const SKEW_STEP = 0.002;

/**
 * Fotoğrafın baskın satır eğimini (dy/dx, piksel; sol-üst orijin) bulur. Her eğim için satır
 * merkezleri o eğime göre "düzeltilir" (y' = y − eğim·x) ve yatayda ayrık satır parçalarının
 * (tablo sütunları, ad ile numara) y' değerlerinin ne kadar çakıştığı puanlanır; en iyi eğim
 * seçilir. Dik fotoğrafta 0 döner (belirgin bir iyileşme yoksa 0 tercih edilir).
 */
export function estimateSkew(lines: { centerX: number; centerY: number; width: number; height: number }[]): number {
  if (lines.length < 4) return 0;
  const sigma = Math.max(quantile(lines.map((l) => l.height), 0.25) * 0.3, 1);
  // Yalnızca yatayda ayrık ve eğimle aynı satıra düşebilecek çiftler puanlanır.
  const pairs: [number, number][] = [];
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const dx = lines[j].centerX - lines[i].centerX;
      const gap = Math.abs(dx) - (lines[i].width + lines[j].width) / 2;
      if (gap < 0) continue;
      if (Math.abs(lines[j].centerY - lines[i].centerY) > Math.abs(dx) * MAX_SKEW_SLOPE + 3 * sigma) continue;
      pairs.push([i, j]);
    }
  }
  if (pairs.length === 0) return 0;

  const score = (slope: number) => {
    let total = 0;
    for (const [i, j] of pairs) {
      const d = lines[j].centerY - lines[i].centerY - slope * (lines[j].centerX - lines[i].centerX);
      total += Math.exp(-(d * d) / (2 * sigma * sigma));
    }
    return total;
  };

  const flat = score(0);
  let best = 0;
  let bestScore = flat;
  const steps = Math.round(MAX_SKEW_SLOPE / SKEW_STEP);
  for (let k = 1; k <= steps; k += 1) {
    for (const slope of [k * SKEW_STEP, -k * SKEW_STEP]) {
      const value = score(slope);
      if (value > bestScore) {
        best = slope;
        bestScore = value;
      }
    }
  }
  // Küçük farklar gürültüdür: dik fotoğrafta gruplama eskisi gibi kalsın.
  return bestScore > flat * 1.1 + 0.5 ? best : 0;
}

/** Kelimenin sözlük puanı: aynen sözlükte 2, yalnızca aksansız biçimi sözlükte 1. */
function dictionaryScore(text: string): number {
  let total = 0;
  for (const word of text.split(/[^\p{L}]+/u)) {
    if (word.length < 2) continue;
    const lower = Array.from(word)
      .map((c) => (c === 'I' ? 'ı' : c.toLocaleLowerCase(LOCALE)))
      .join('');
    const spellings = dictionarySpellings(asciiFoldLower(lower));
    if (spellings.includes(lower) || spellings.includes(lower.replace(/ı/g, 'i'))) total += 2;
    else if (spellings.length > 0) total += 1;
  }
  return total;
}

const digitsOf = (text: string) => text.replace(/\D/g, '');

/**
 * OCR'ın aday okumalarından sözlüğe en uyanını seçer. Aday yalnızca rakamları birebir
 * aynıysa (numaralar asla değişmez) ve daha çok kelimesi sözlükte bulunuyorsa seçilir.
 */
export function pickCandidate(line: OcrLine): string {
  const candidates = line.candidates ?? [];
  if (candidates.length < 2) return line.text;
  const digits = digitsOf(line.text);
  let best = line.text;
  let bestScore = dictionaryScore(line.text);
  for (const candidate of candidates) {
    if (candidate.text === line.text || digitsOf(candidate.text) !== digits) continue;
    const value = dictionaryScore(candidate.text);
    if (value > bestScore) {
      best = candidate.text;
      bestScore = value;
    }
  }
  return best;
}

/**
 * Satırları görsel satırlara toplar; her satırın hücreleri soldan sağa sıralanır. Eğik
 * fotoğrafta önce satır eğimi bulunur (estimateSkew) ve gruplama düzeltilmiş konumla yapılır.
 * Konum bilgisi yoksa OCR sırası korunur.
 */
export function groupIntoCells(result: OcrResult): RowCell[][] {
  const lines = result.blocks.flatMap((b) => b.lines).filter((l) => l.text.trim().length > 0);
  if (lines.length === 0) return [];
  const cellOf = (l: OcrLine, text: string): RowCell => {
    const cell: RowCell = l.confidence === undefined ? { text } : { text, confidence: l.confidence };
    const alternates = [l.text, ...(l.candidates ?? []).map((c) => c.text)].filter((t, i, all) => t !== text && all.indexOf(t) === i);
    if (alternates.length > 0) cell.alternates = alternates;
    return cell;
  };

  const allFramed = lines.every((l) => l.frame && l.frame.height > 0);
  if (!allFramed) return lines.map((l) => [cellOf(l, pickCandidate(l))]);

  const positioned: PositionedLine[] = lines.map((l) => {
    const f = l.frame as OcrFrame;
    return {
      cell: cellOf(l, pickCandidate(l)),
      left: f.left,
      width: f.width,
      height: f.height,
      centerX: f.left + f.width / 2,
      centerY: f.top + f.height / 2,
    };
  });

  const slope = estimateSkew(positioned);
  // Eğik satırın eksene hizalı kutusu, eğim × genişlik kadar yüksektir; asıl yazı yüksekliği:
  const trueHeights = positioned.map((p) => Math.max(p.height - p.width * Math.abs(slope), p.height * 0.3));
  // Aynı satırdaki sütunlar: düzeltilmiş merkezler yarım satır yüksekliğinden yakınsa birleşir.
  const tolerance = Math.max(median(trueHeights) * 0.5, 2);
  const rowY = (p: PositionedLine) => p.centerY - slope * p.centerX;

  const sorted = [...positioned].sort((a, b) => rowY(a) - rowY(b) || a.left - b.left);
  const rows: { y: number; members: typeof positioned }[] = [];
  for (const line of sorted) {
    const current = rows[rows.length - 1];
    if (current && Math.abs(rowY(line) - current.y) <= tolerance) {
      current.members.push(line);
      current.y = current.members.reduce((sum, m) => sum + rowY(m), 0) / current.members.length;
    } else {
      rows.push({ y: rowY(line), members: [line] });
    }
  }
  return rows.map((r) => [...r.members].sort((a, b) => a.left - b.left).map((m) => m.cell));
}

/** groupIntoCells'in yalnızca metinleri (eski imza). */
export function groupIntoRows(result: OcrResult): string[][] {
  return groupIntoCells(result).map((cells) => cells.map((c) => c.text));
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
/** Yalnızca Türkçe klavyeden gelen harfler (yazılan metnin Türkçe olduğunu gösterir). */
const TURKISH_LETTERS_RE = /[çğışöüÇĞİŞÖÜ]/;

/** Bir kelimede denenecek en fazla "I" sayısı (2^n yazım). */
const MAX_AMBIGUOUS_I = 6;

/**
 * BÜYÜK HARF kelimedeki her "I" için "ı"/"i" seçeneklerini dener; bilinen bir ad/soyad
 * yazımı (trNames) bulunursa onu BÜYÜK HARF olarak döndürür: "NAZLI" → "NAZLI" (ı),
 * "SIDIKA" → "SIDIKA" (ı, ı). Bulunamazsa null.
 */
function knownDotlessSpelling(word: string): string | null {
  const chars = Array.from(word);
  const positions = chars.flatMap((c, i) => (c === 'I' ? [i] : []));
  if (positions.length === 0 || positions.length > MAX_AMBIGUOUS_I) return null;
  const lower = chars.map((c) => (c === 'I' ? c : c.toLocaleLowerCase(LOCALE)));
  // En çok "ı" içeren yazımdan başlanır (liste yalnızca "ı"lı kelimeler içerir).
  for (let mask = (1 << positions.length) - 1; mask >= 0; mask--) {
    const candidate = [...lower];
    positions.forEach((pos, bit) => {
      candidate[pos] = mask & (1 << bit) ? 'ı' : 'i';
    });
    const spelled = candidate.join('');
    if (isKnownDotlessName(spelled)) return spelled.toLocaleUpperCase(LOCALE);
  }
  return null;
}

/** Tek bir kelime parçası (tiresiz) için "I" → "İ" kararı; bkz. restoreDottedI. */
function restoreDottedIPart(part: string): string {
  if (!part.includes('I')) return part;
  const known = knownDotlessSpelling(part);
  if (known) return known;
  const letters = part.replace(/[^\p{L}]/gu, '');
  const vowels = letters.match(VOWELS_RE) ?? [];
  if (vowels.length > 0 && vowels.every((v) => v === 'I')) return part;
  return part.replace(/I/g, TR_UPPER_DOTTED_I);
}

/**
 * BÜYÜK HARF kelimede ASCII "I" → "İ" (ML Kit "İ"nin noktasını çoğu zaman kaçırır):
 * "SELIN" → "SELİN", "ILKER" → "İLKER".
 *
 * Ödünleşim: gerçek "ı" içeren kelimeler de büyük harfte "I" olarak gelir ("IŞIK", "KILIÇ",
 * "YILMAZ"). Ayırt etmenin kesin yolu yok; "İ" tercih edilir, şu durumlar hariç:
 * - Fotoğrafın geri kalanında "İ" okunmuşsa (`dotAware`) OCR noktaları görüyordur; "I" gerçekten "ı"dır.
 * - Kelimenin "ı"lı yazımı yaygın bir ad/soyadsa (trNames: "YILMAZ", "NAZLI", "AYDIN") o seçilir.
 * - Kelimenin tüm ünlüleri "I" ise ("KILIÇ", "IŞIK", "YILDIZ") büyük olasılıkla "ı"dır.
 * - Kelimenin tek harfi "I" ise dokunulmaz.
 * Tireli adlarda her parça ayrı değerlendirilir ("AYŞE-NAZLI"). Listede olmayan yanlış kalan
 * adları öğretmen inceleme listesinde düzeltir.
 */
function restoreDottedI(text: string, dotAware: boolean): string {
  if (dotAware || !text.includes('I')) return text;
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2 || letters !== letters.toLocaleUpperCase(LOCALE)) return text;
  return text.split('-').map(restoreDottedIPart).join('-');
}

/** Okunan harf `read`, sözlükteki `dict` harfiyle çelişmiyor mu (OCR yalnızca işaret düşürür)? */
function compatibleLetter(read: string, dict: string): boolean {
  // Büyük "I": noktası düşmüş "İ" ya da gerçek "ı" olabilir.
  if (read === 'I') return dict === 'i' || dict === 'ı';
  // Noktası okunmuş "İ" kesindir.
  if (read === 'İ') return dict === 'i';
  const lower = read.toLocaleLowerCase(LOCALE);
  // OCR "i" ile "ı"yı iki yönde de karıştırır ("Smaıl").
  if (lower === 'ı') return dict === 'ı' || dict === 'i';
  return lower === dict || lower === asciiFoldLower(dict);
}

/** Sözlük yazımını okunan kelimenin düzeniyle yazar (BÜYÜK, Baş harf büyük ya da küçük). */
function inCaseOf(word: string, spelling: string): string {
  const upper = word === word.toLocaleUpperCase(LOCALE) && word !== word.toLocaleLowerCase(LOCALE);
  if (upper) return spelling.toLocaleUpperCase(LOCALE);
  const first = Array.from(word)[0];
  if (first !== first.toLocaleLowerCase(LOCALE)) {
    const [head, ...rest] = Array.from(spelling);
    return head.toLocaleUpperCase(LOCALE) + rest.join('');
  }
  return spelling;
}

/**
 * Türkçe harf geri getirme: kelimenin aksansız biçimi sözlükte (trNames) okunan harflerle
 * çelişmeyen TEK bir yazımla eşleşiyorsa o yazımı, okunan kelimenin büyük/küçük düzeniyle
 * döndürür: "Irem" → "İrem", "DOGAN" → "DOĞAN", "Ozturk" → "Öztürk", "Sahin" → "Şahin".
 * Sözlükte yoksa ya da belirsizse null (kelime okunduğu gibi kalır).
 * `dotAware`: fotoğrafta "İ" okunduysa, belirsiz "I" için "ı"lı yazım tercih edilir.
 * `allowDroppedI`: kelime sözlükte yoksa düşmüş baş "İ" de denenir ("Brahim" → "İbrahim");
 * yalnızca düşük güvenli ya da OCR adaylarının desteklediği satırlarda açılır.
 */
export function restoreTurkishLetters(word: string, dotAware = false, allowDroppedI = false): string | null {
  const chars = Array.from(word);
  if (chars.length < 2 || !chars.every((c) => /\p{L}/u.test(c))) return null;
  const key = asciiFoldLower(chars.map((c) => (c === 'I' ? 'i' : c.toLocaleLowerCase(LOCALE))).join(''));
  if (Array.from(key).length !== chars.length) return null;
  let matches = dictionarySpellings(key).filter((spelling) => {
    const letters = Array.from(spelling);
    return letters.length === chars.length && letters.every((d, i) => compatibleLetter(chars[i], d));
  });
  if (matches.length > 1 && dotAware) {
    matches = matches.filter((spelling) => Array.from(spelling).every((d, i) => chars[i] !== 'I' || d === 'ı'));
  }
  if (matches.length === 1) return inCaseOf(word, matches[0]);
  if (allowDroppedI && matches.length === 0 && dictionarySpellings(key).length === 0) return restoreDroppedInitialI(word);
  return null;
}

/**
 * Vision kelime başındaki "İ"yi bazen tümden atlar: "Brahim", "Smail", "Rem". Kelime sözlükte
 * yoksa, büyük harfle başlıyorsa ve başına "i"/"ı" eklenmiş hâli sözlükte TEK bir yazımla
 * eşleşiyorsa o yazım döner ("Brahim" → "İbrahim").
 */
function restoreDroppedInitialI(word: string): string | null {
  const chars = Array.from(word);
  if (chars.length < 3 || chars[0] === chars[0].toLocaleLowerCase(LOCALE)) return null;
  const key = asciiFoldLower(`i${chars.map((c) => (c === 'I' ? 'i' : c.toLocaleLowerCase(LOCALE))).join('')}`);
  const matches = dictionarySpellings(key).filter((spelling) => {
    const letters = Array.from(spelling).slice(1);
    return letters.length === chars.length && letters.every((d, i) => compatibleLetter(chars[i], d));
  });
  return matches.length === 1 ? inCaseOf(word, matches[0]) : null;
}

interface CleanContext {
  /** Fotoğraf okuması mı (OCR düzeltmeleri yapılır) yoksa yazılan metin mi. */
  ocr: boolean;
  dotAware: boolean;
  /** Bu kelimede düşmüş baş "İ" denensin mi. */
  droppedI: (word: string) => boolean;
  /** Yazılan metinde Türkçe harf yok: BÜYÜK "I" "ı" değil "i"dir ("MICHAEL" → "Michael"). */
  asciiCaps?: boolean;
}

/**
 * Yazılan BÜYÜK HARF kelimede baş harf dışındaki "I"ları "İ" yapar; böylece Türkçe küçültme
 * "i" verir: "SMITH" → "SMİTH" → "Smith". Baştaki "I" büyük kalır.
 */
function asciiCapsToDotted(text: string): string {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length < 2 || letters !== letters.toLocaleUpperCase(LOCALE)) return text;
  return text.replace(/(?<=\p{L})I/gu, TR_UPPER_DOTTED_I);
}

/** Ad kelimesindeki OCR karışıklıklarını düzeltir: "Y1LMAZ" → "YILMAZ", "lŞIK" → "IŞIK". */
function cleanNameToken(token: string, ctx: CleanContext): NameToken | null {
  let text = token.replace(/[^\p{L}\d'’\-.]/gu, '').replace(/^[-'.’]+|[-'’]+$/g, '');
  // Tek harf + nokta baş harftir ("M."), diğer noktalar gürültü.
  if (!/^\p{L}\.$/u.test(text)) text = text.replace(/\./g, '');
  if (!text) return null;
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length === 0) return null;

  if (!ctx.ocr) {
    // Yazılan metin: rakamlar atılır (uyarı gösterilir), harflere dokunulmaz.
    const hadDigits = /\d/.test(text);
    if (hadDigits) text = text.replace(/\d/g, '');
    if (ctx.asciiCaps) text = asciiCapsToDotted(text);
    return { text, hadDigits };
  }
  const { dotAware } = ctx;

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
  // Önce sözlük (Türkçe harfleri geri getirir), bulunamazsa "I" → "İ" kuralları.
  const restored = text
    .split('-')
    .map((part) => restoreTurkishLetters(part, dotAware, ctx.droppedI(part)) ?? restoreDottedI(part, dotAware))
    .join('-');
  return { text: restored, hadDigits };
}

interface RawRow {
  /** Addan önceki sayılar (sıra no, okul no). */
  numbers: string[];
  /** Addan sonraki sayılar ("S.No | Adı Soyadı | Okul No" düzeni). */
  trailingNumbers: string[];
  /** İlk sayının ardından "." ")" "-" geldi mi (düz listede sıra numarası işareti). */
  punctuatedLead: boolean;
  nameTokens: NameToken[];
  /** Harf içeren hücrelerin en düşük okuma güveni. */
  nameConfidence?: number;
  /** Rakam içeren hücreler (okul numarasının güvenini bulmak için). */
  numberCells: RowCell[];
}

function minConfidence(cells: RowCell[]): number | undefined {
  const values = cells.map((c) => c.confidence).filter((c): c is number => c !== undefined);
  return values.length > 0 ? Math.min(...values) : undefined;
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

/**
 * Metinde sözlükte "i" ile yazılan bir ad BÜYÜK HARF ve noktasız ("SELIN", "ELIF") okunmuş mu?
 * Öyleyse OCR "İ"nin noktasını bu fotoğrafta da düşürüyordur.
 */
function dropsDots(text: string): boolean {
  return text.split(/[^\p{L}]+/u).some((word) => {
    if (word.length < 3 || !word.includes('I') || word !== word.toLocaleUpperCase(LOCALE)) return false;
    const restored = restoreTurkishLetters(word);
    if (!restored) return false;
    const read = Array.from(word);
    return Array.from(restored).some((c, i) => read[i] === 'I' && c === 'İ');
  });
}

/** Aday okumalardan biri kelimeyi baş "İ" ile okumuş mu ("Brahim" ↔ "İbrahim")? */
function alternatesSupportDroppedI(word: string, rowCells: RowCell[]): boolean {
  const target = foldTurkish(`i${word}`);
  return rowCells.some((c) =>
    (c.alternates ?? []).some((alt) => alt.split(/[^\p{L}]+/u).some((w) => w.length > 0 && foldTurkish(w) === target)),
  );
}

interface RowContext {
  ocr: boolean;
  dotAware: boolean;
  asciiCaps: boolean;
}

function parseRow(rowCells: RowCell[], context: RowContext): RawRow | null {
  const cells = rowCells.map((c) => c.text);
  const rowText = cells.join(' ');
  if (DATE_RE.test(rowText) || YEAR_RANGE_RE.test(rowText)) return null;

  const numbers: string[] = [];
  const trailingNumbers: string[] = [];
  const nameTokens: NameToken[] = [];
  let punctuatedLead = false;

  // Aynı satırda sözlükteki bir ad noktasız okunduysa ("SELIN BAYEZIT") bu satırda noktalar
  // düşmüştür: satırın diğer "I"ları da "İ" olabilir.
  const dotAware = context.dotAware && !rowCells.some((c) => dropsDots(c.text));
  const rowConfidence = minConfidence(rowCells);
  const lowConfidence = rowConfidence !== undefined && rowConfidence < DROPPED_I_MAX_CONFIDENCE;
  const ctx: CleanContext = {
    ocr: context.ocr,
    dotAware,
    asciiCaps: context.asciiCaps,
    droppedI: (word) => lowConfidence || alternatesSupportDroppedI(word, rowCells),
  };

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
    const cleaned = cleanNameToken(token, ctx);
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
  return {
    numbers,
    trailingNumbers,
    punctuatedLead,
    nameTokens,
    nameConfidence: minConfidence(rowCells.filter((c) => (c.text.match(/\p{L}/gu) ?? []).length >= 2)),
    numberCells: rowCells.filter((c) => /\d/.test(c.text)),
  };
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

/**
 * İki sayılı (S.No + Okul No) tabloda tek sayılı satır: sıra numarası okunmamış olabilir
 * (Vision tek haneli hücreleri arka arkaya birkaç satırda atlayabilir). En yakın iki sayılı
 * satırlardan (yukarıda ve aşağıda, k satır uzakta) beklenen sıra numarası hesaplanır:
 * - sayı beklenen sıra numarasına eşitse sıra numarasıdır;
 * - değilse ve en az 3 basamaklıysa ve bir komşunun okul numarasıyla uzunluğu en çok 1 farklıysa okul numarasıdır
 *   ("1 | 112 | SELİN" satırında "1" kaçırılmış);
 * - kısa sayılar (1–2 basamak) arada okunmamış satır varken sıra numarası da olabilir ("7"):
 *   ancak hem yukarıdaki hem aşağıdaki iki sayılı satırın sırasına uymuyorsa okul numarası sayılır.
 */
function isMissedOrdinalRow(rows: RawRow[], index: number): boolean {
  const value = rows[index].numbers[0];
  const isDouble = (row: RawRow | undefined): row is RawRow => !!row && row.numbers.length >= 2;
  const nearest = (direction: 1 | -1) => {
    for (let i = index + direction, k = 1; i >= 0 && i < rows.length; i += direction, k += 1) {
      if (isDouble(rows[i])) return { row: rows[i], expected: Number(rows[i].numbers[0]) - direction * k };
    }
    return null;
  };
  const neighbors = [nearest(-1), nearest(1)].filter((n): n is NonNullable<typeof n> => n !== null);
  if (neighbors.length === 0) return false;
  if (neighbors.some((n) => n.expected === Number(value))) return false;
  const schoolLength = (row: RawRow) => row.numbers[row.numbers.length - 1].length;
  // Okul numaraları sıralı listede 3→4 basamağa geçebilir; uzun sayıda bir komşu yeter.
  if (value.length >= 3) return neighbors.some(({ row }) => Math.abs(value.length - schoolLength(row)) <= 1);
  return neighbors.length === 2 && neighbors.every(({ row }) => value.length === schoolLength(row));
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
export function parseRows(rows: string[][], options: ParseOptions = {}): ParsedStudent[] {
  return parseCellRows(
    rows.map((cells) => cells.map((text) => ({ text }))),
    options,
  );
}

/** parseRows'un güven bilgili sürümü: hücre güvenleri öğrencinin `confidence` alanına geçer. */
export function parseCellRows(rows: RowCell[][], options: ParseOptions = {}): ParsedStudent[] {
  const ocr = options.ocr ?? true;
  // Fotoğrafın herhangi bir yerinde "İ" okunduysa OCR noktaları ayırt ediyordur.
  const dotAware = rows.some((cells) => cells.some((c) => c.text.includes('İ')));
  // Yazılan metinde hiç Türkçe harf yoksa (ASCII klavye) BÜYÜK "I" = "i".
  const asciiCaps = !ocr && !rows.some((cells) => cells.some((c) => TURKISH_LETTERS_RE.test(c.text)));
  const context: RowContext = { ocr, dotAware, asciiCaps };
  const raw = rows.map((cells) => parseRow(cells, context)).filter((r): r is RawRow => r !== null);
  const singlesAreOrdinals = singleNumbersAreOrdinals(raw);

  const seen = new Set<string>();
  const students: ParsedStudent[] = [];
  for (const [index, row] of raw.entries()) {
    const ordinals = singlesAreOrdinals && !(row.numbers.length === 1 && isMissedOrdinalRow(raw, index));
    const number = schoolNumberOf(row, ordinals);

    const fullName = toTurkishTitleCase(row.nameTokens.map((t) => t.text).join(' '));
    const hadDigits = row.nameTokens.some((t) => t.hadDigits);
    const student: ParsedStudent = { number, fullName, warnings: assessName(fullName, hadDigits) };
    const numberCell = number ? row.numberCells.filter((c) => digitsOf(c.text).includes(number)) : [];
    const confidence = minConfidence([
      ...(row.nameConfidence === undefined ? [] : [{ text: '', confidence: row.nameConfidence }]),
      ...numberCell,
    ]);
    if (confidence !== undefined) student.confidence = confidence;

    const key = keyOf(student);
    if (seen.has(key)) continue;
    seen.add(key);
    students.push(student);
  }
  return students;
}

/** ML Kit / Vision sonucunu öğrenci listesine çevirir. */
export function parseOcrResult(result: OcrResult): ParsedStudent[] {
  return parseCellRows(groupIntoCells(result));
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

/**
 * Yapıştırılan / yazılan düz liste ("Listeyi yapıştır"): satır başına bir öğrenci; virgül ve
 * noktalı virgül de ayraçtır ("Ali Veli, Ayşe Kaya; Can Su"). İsteğe bağlı baştaki numaralar:
 * "12. Ali Veli", "12 - Ali Veli", "12) Ali Veli", "512 Ali Veli" (sıra no / okul no ayrımı
 * parseRows kurallarıyla). Ayraçtan sonra yalnızca sayı gelirse önceki adın okul numarasıdır
 * ("Ali Veli, 512"). Başlık satırları ("Adı Soyadı") ve yinelemeler atılır.
 * Varsayılan `ocr: false`: yazılan adlar sözlükle "düzeltilmez" ("Pek Ayşe" "İpek" olmaz).
 */
export function parsePlainNameList(text: string, options: ParseOptions = {}): ParsedStudent[] {
  const items: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    line.split(/[;,]/).forEach((segment, index) => {
      const item = segment.replace(/\s+/g, ' ').trim();
      if (!item) return;
      if (index > 0 && /^\d+$/.test(item) && items.length > 0) items[items.length - 1] += ` ${item}`;
      else items.push(item);
    });
  }
  return parseRows(
    items.map((item) => [item]),
    { ocr: options.ocr ?? false },
  );
}
