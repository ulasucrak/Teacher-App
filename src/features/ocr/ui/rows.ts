/**
 * Ortak öğrenci listesi (fotoğraf / yapıştırma / elle yazma) için saf yardımcılar.
 * Üç yol da aynı `ReviewRow` listesini besler; kaydetmeden önce `toDrafts` ile süzülür.
 */
import { parsePlainText, type ParsedStudent } from '../parser';
import { appendParsed, createManualRow, nextRowId, type ExistingStudent, type ReviewRow } from '../review';

/** Satırların kaynağı: fotoğraf sayfası kimliği ya da yapıştırma/elle yazma. */
export const PASTE_SOURCE = 'paste';

export interface MergeResult {
  rows: ReviewRow[];
  /** Eklenen satır sayısı. */
  added: number;
  /** Listede ya da sınıfta zaten olduğu için atlanan satır sayısı. */
  skipped: number;
}

/**
 * Okunan satırları listeye ekler. Sınıfta ya da listede zaten olan öğrenciler (ad + numara
 * eşleşmesi) eklenmez; sayfalar çakışınca aynı öğrenci iki kez görünmez.
 */
export function mergeParsed(
  rows: ReviewRow[],
  parsed: ParsedStudent[],
  sourceId: string,
  existing: ExistingStudent[],
  makeId: () => string = nextRowId,
): MergeResult {
  const appended = appendParsed(rows, parsed, sourceId, existing, makeId).slice(rows.length);
  const kept = appended.filter((r) => r.include);
  return { rows: [...rows, ...kept], added: kept.length, skipped: appended.length - kept.length };
}

/**
 * Yapıştırılan düz liste: her satır bir öğrenci, baştaki numara okul numarası olarak alınır.
 * TODO(O02): `parsePlainNameList` '@/features/ocr' içinden dışa açılınca onu kullanın.
 */
export function parsePastedList(text: string): ParsedStudent[] {
  return parsePlainText(text).filter((s) => s.fullName.trim().length > 0);
}

/** Elle yazılan tek satır ("12 Ayşe Yılmaz" ya da "Ayşe Yılmaz"). Ad yoksa null. */
export function parseTypedLine(line: string, makeId: () => string = nextRowId): ReviewRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const [parsed] = parsePastedList(trimmed);
  const row = createManualRow(makeId);
  if (parsed) return { ...row, fullName: parsed.fullName, number: parsed.number ?? '' };
  // Ayrıştırıcı adı tanımadıysa yazılanı olduğu gibi al (uyarı satırda görünür).
  return { ...row, fullName: trimmed };
}

