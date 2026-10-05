/**
 * İnceleme listesi mantığı (saf): okunan satırları birleştirme, yineleme ve düşük
 * güven uyarıları, kaydedilecek satırları hazırlama.
 */
import { assessName, foldTurkish, type NameWarning, type ParsedStudent } from './parser';

export interface ReviewRow {
  id: string;
  number: string;
  fullName: string;
  include: boolean;
  /** Hangi fotoğraftan geldiği (elle eklenen satırda null). */
  photoId: string | null;
  /** Okuma sırasında rakam düzeltildiyse kalıcı uyarı. */
  ocrDigits: boolean;
}

/** Var olan öğrencinin karşılaştırma için gereken alanları. */
export interface ExistingStudent {
  full_name: string;
  number: string | null;
}

export type RowIssue = NameWarning | 'existing' | 'existingNumber' | 'existingName' | 'repeated' | 'emptyName';

export const issueLabels: Record<RowIssue, string> = {
  existing: 'Bu sınıfta zaten var',
  existingNumber: 'Bu numara sınıfta başka bir öğrencide var',
  existingName: 'Bu adda bir öğrenci sınıfta zaten var',
  repeated: 'Listede birden fazla geçiyor',
  emptyName: 'Ad soyad boş',
  digits: 'Adda rakam okundu, kontrol edin',
  short: 'Ad çok kısa, kontrol edin',
  singleWord: 'Soyadı eksik olabilir',
};

/** Uyarılar arasında yinelemeler daha önemlidir; önce onlar gösterilir. */
const ISSUE_ORDER: RowIssue[] = ['existing', 'existingNumber', 'existingName', 'repeated', 'emptyName', 'digits', 'short', 'singleWord'];

export function nameKey(name: string): string {
  return foldTurkish(name);
}

export function numberKey(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

let idCounter = 0;
export function nextRowId(): string {
  idCounter += 1;
  return `row-${idCounter}`;
}

interface StudentKey {
  name: string;
  number: string;
}

/** Yineleme uyarısı için gevşek eşleşme: numara ya da ad aynı. */
function looselySame(a: StudentKey, b: StudentKey): boolean {
  if (a.number && b.number && a.number === b.number) return true;
  return a.name.length > 0 && a.name === b.name;
}

/**
 * Kesin eşleşme (işareti otomatik kaldırmak için): ad aynı ve numara da aynı ya da
 * taraflardan birinde numara yok. Yalnızca numara tutuyorsa bu bir uyarıdır, eşleşme değil.
 */
export function sameStudent(a: StudentKey, b: StudentKey): boolean {
  if (!a.name || a.name !== b.name) return false;
  return !a.number || !b.number || a.number === b.number;
}

type ExistingMatch = 'same' | 'number' | 'name' | null;

function matchExisting(key: StudentKey, existing: StudentKey[]): ExistingMatch {
  if (existing.some((k) => sameStudent(k, key))) return 'same';
  if (key.number && existing.some((k) => k.number === key.number)) return 'number';
  if (key.name && existing.some((k) => k.name === key.name)) return 'name';
  return null;
}

/**
 * Yeni fotoğrafın satırlarını listeye ekler. Sınıfta ya da listede zaten olan satırlar
 * (ad + numara eşleşmesi, bkz. `sameStudent`) işaretsiz eklenir; sayfalar çakışırsa
 * öğrenci iki kez eklenmesin. Yalnızca numarası tutan satır işaretli kalır, uyarı alır.
 */
export function appendParsed(
  rows: ReviewRow[],
  parsed: ParsedStudent[],
  photoId: string,
  existing: ExistingStudent[],
  makeId: () => string = nextRowId,
): ReviewRow[] {
  const known = [
    ...existing.map((s) => ({ name: nameKey(s.full_name), number: numberKey(s.number) })),
    ...rows.map((r) => ({ name: nameKey(r.fullName), number: numberKey(r.number) })),
  ];
  const added: ReviewRow[] = [];
  for (const p of parsed) {
    const key = { name: nameKey(p.fullName), number: numberKey(p.number) };
    const duplicate = known.some((k) => sameStudent(k, key));
    known.push(key);
    added.push({
      id: makeId(),
      number: p.number ?? '',
      fullName: p.fullName,
      include: !duplicate,
      photoId,
      ocrDigits: p.warnings.includes('digits'),
    });
  }
  return [...rows, ...added];
}

export function createManualRow(makeId: () => string = nextRowId): ReviewRow {
  return { id: makeId(), number: '', fullName: '', include: true, photoId: null, ocrDigits: false };
}

/**
 * Satır başına uyarılar. Yineleme yalnızca eklenecek (işaretli) satırlar arasında aranır;
 * ilk geçen satır temiz kalır, sonrakiler "birden fazla" uyarısı alır.
 */
export function computeIssues(rows: ReviewRow[], existing: ExistingStudent[]): Map<string, RowIssue[]> {
  const existingKeys = existing.map((s) => ({ name: nameKey(s.full_name), number: numberKey(s.number) }));
  const seen: StudentKey[] = [];
  const result = new Map<string, RowIssue[]>();

  for (const row of rows) {
    const issues = new Set<RowIssue>();
    const key = { name: nameKey(row.fullName), number: numberKey(row.number) };

    if (!key.name) {
      issues.add('emptyName');
    } else {
      for (const w of assessName(row.fullName, row.ocrDigits)) issues.add(w);
    }
    const match = matchExisting(key, existingKeys);
    if (match === 'same') issues.add('existing');
    else if (match === 'number') issues.add('existingNumber');
    else if (match === 'name') issues.add('existingName');
    if (row.include) {
      if (seen.some((k) => looselySame(k, key))) issues.add('repeated');
      seen.push(key);
    }
    result.set(
      row.id,
      ISSUE_ORDER.filter((i) => issues.has(i)),
    );
  }
  return result;
}

export interface StudentDraft {
  fullName: string;
  number: string | null;
}

/** Eklenecek satırlar: işaretli ve adı dolu; boşluklar sadeleşir. */
export function toDrafts(rows: ReviewRow[]): StudentDraft[] {
  return rows
    .filter((r) => r.include)
    .map((r) => ({ fullName: r.fullName.replace(/\s+/g, ' ').trim(), number: r.number.trim() || null }))
    .filter((d) => d.fullName.length > 0);
}
