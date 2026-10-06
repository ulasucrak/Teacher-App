import { useCallback, useMemo, useRef, useState } from 'react';

import { permissionMessages, pickPhoto, type PhotoSource } from '../photos';
import { isExpoGo, recognizePhoto } from '../recognize';
import { computeIssues, nextRowId, toDrafts, type ExistingStudent, type ReviewRow, type RowIssue, type StudentDraft } from '../review';
import { mergeParsed, parsePastedList, parseTypedLine, PASTE_SOURCE } from './rows';

const NO_STUDENTS: readonly ExistingStudent[] = [];

export type CollectMethod = 'photo' | 'paste' | 'type';

/** Route parametresinden ekleme yolu ("photo" | "paste" | "type"); geçersizse undefined. */
export function toCollectMethod(value: unknown): CollectMethod | undefined {
  return value === 'photo' || value === 'paste' || value === 'type' ? value : undefined;
}

export interface ImportPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  /** Bu sayfadan listeye eklenen satır sayısı. */
  rowCount: number;
}

export interface CollectNotice {
  kind: 'error' | 'warning' | 'info';
  message: string;
  /** İzin kalıcı reddedildiyse "Ayarları aç" gösterilir. */
  settings?: boolean;
}

export const collectMessages = {
  nothingFound: 'Bu fotoğrafta liste bulunamadı. Listeyi yakından ve düz çekin.',
  nothingPasted: 'Listede ad bulunamadı. Her satıra bir öğrenci yazın.',
} as const;

function skippedNote(skipped: number): CollectNotice | null {
  return skipped > 0 ? { kind: 'info', message: `${skipped} satır zaten listede olduğu için atlandı.` } : null;
}

export interface StudentCollector {
  method: CollectMethod;
  setMethod: (method: CollectMethod) => void;
  rows: ReviewRow[];
  issues: Map<string, RowIssue[]>;
  /** Kaydedilecek öğrenciler (adı dolu satırlar). */
  drafts: StudentDraft[];
  photos: ImportPhoto[];
  reading: PhotoSource | null;
  notice: CollectNotice | null;
  dismissNotice: () => void;
  photoAvailable: boolean;
  pasteText: string;
  setPasteText: (text: string) => void;
  typedText: string;
  setTypedText: (text: string) => void;
  addPhoto: (source: PhotoSource) => Promise<void>;
  removePhoto: (photoId: string) => void;
  /** Yapıştırılan metni listeye ekler; eklenen satır sayısını döner. */
  addPasted: () => number;
  /** Elle yazılan satırı ekler; eklendiyse true. */
  addTyped: () => boolean;
  updateRow: (id: string, patch: Partial<Pick<ReviewRow, 'number' | 'fullName'>>) => void;
  removeRow: (id: string) => void;
  /** Alanlarda eklenmemiş metin var mı (yapıştırılan liste ya da yazılan ad). */
  hasPending: boolean;
  /**
   * Bekleyen metni listeye ekler ve kaydedilecek öğrencileri döner (Devam / Kaydet öncesi).
   * Yapıştırılan metinden hiç öğrenci eklenemediyse null döner (uyarı gösterilir; ekran ilerlemez).
   */
  flush: () => StudentDraft[] | null;
  /** Kullanıcı bir şey girdi mi (çıkış onayı için). */
  dirty: boolean;
}

/**
 * Sihirbazın "Öğrenciler" adımı ve "Öğrenci ekle" ekranı için ortak durum: üç yol
 * (fotoğraf, yapıştırma, elle) tek düzenlenebilir listeyi besler.
 * `existing`: sınıftaki öğrenciler (yineleme uyarısı ve atlama için).
 */
export function useStudentCollector(
  existing: readonly ExistingStudent[] = NO_STUDENTS,
  initialMethod?: CollectMethod,
): StudentCollector {
  const photoAvailable = useMemo(() => !isExpoGo(), []);
  const [method, setMethod] = useState<CollectMethod>(
    initialMethod ?? (photoAvailable ? 'photo' : 'paste'),
  );
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [photos, setPhotos] = useState<ImportPhoto[]>([]);
  const [reading, setReading] = useState<PhotoSource | null>(null);
  const [notice, setNotice] = useState<CollectNotice | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [typedText, setTypedText] = useState('');

  // Eşzamanlı ekleme/okuma için güncel satırlar; tüm değişiklikler `commit` üzerinden geçer.
  const rowsRef = useRef(rows);
  const existingList = useMemo(() => [...existing], [existing]);

  const commit = useCallback((next: ReviewRow[]) => {
    rowsRef.current = next;
    setRows(next);
  }, []);

  const issues = useMemo(() => computeIssues(rows, existingList), [rows, existingList]);
  const drafts = useMemo(() => toDrafts(rows), [rows]);

  const addPhoto = useCallback(
    async (source: PhotoSource) => {
      setNotice(null);
      const picked = await pickPhoto(source);
      if (picked.status === 'cancelled') return;
      if (picked.status === 'denied') {
        setNotice({ kind: 'warning', message: permissionMessages[picked.source], settings: !picked.canAskAgain });
        return;
      }
      if (picked.status === 'error') {
        setNotice({ kind: 'error', message: picked.message });
        return;
      }
      setReading(source);
      const outcome = await recognizePhoto(picked.uri, picked.width);
      setReading(null);
      if (!outcome.ok) {
        setNotice({ kind: 'error', message: outcome.message });
        return;
      }
      if (outcome.students.length === 0) {
        setNotice({ kind: 'warning', message: collectMessages.nothingFound });
        return;
      }
      const photoId = nextRowId();
      const merged = mergeParsed(rowsRef.current, outcome.students, photoId, existingList);
      commit(merged.rows);
      setPhotos((prev) => [
        ...prev,
        { id: photoId, uri: outcome.uri, width: picked.width, height: picked.height, rowCount: merged.added },
      ]);
      setNotice(skippedNote(merged.skipped));
    },
    [commit, existingList],
  );

  const removePhoto = useCallback(
    (photoId: string) => {
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      commit(rowsRef.current.filter((r) => r.photoId !== photoId));
    },
    [commit],
  );

  const addPastedText = useCallback(
    (text: string): number => {
      if (!text.trim()) return 0;
      const parsed = parsePastedList(text);
      if (parsed.length === 0) {
        setNotice({ kind: 'warning', message: collectMessages.nothingPasted });
        return 0;
      }
      const merged = mergeParsed(rowsRef.current, parsed, PASTE_SOURCE, existingList);
      commit(merged.rows);
      setPasteText('');
      setNotice(skippedNote(merged.skipped));
      return merged.added;
    },
    [commit, existingList],
  );

  const addPasted = useCallback(() => addPastedText(pasteText), [addPastedText, pasteText]);

  const addTypedText = useCallback(
    (text: string): boolean => {
      const row = parseTypedLine(text);
      if (!row) return false;
      commit([...rowsRef.current, row]);
      setTypedText('');
      setNotice(null);
      return true;
    },
    [commit],
  );

  const addTyped = useCallback(() => addTypedText(typedText), [addTypedText, typedText]);

  const updateRow = useCallback(
    (id: string, patch: Partial<Pick<ReviewRow, 'number' | 'fullName'>>) => {
      commit(rowsRef.current.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [commit],
  );

  const removeRow = useCallback(
    (id: string) => {
      commit(rowsRef.current.filter((r) => r.id !== id));
    },
    [commit],
  );

  const flush = useCallback((): StudentDraft[] | null => {
    if (pasteText.trim() && addPastedText(pasteText) === 0) {
      // Metin yoksayılıp ilerlenmesin: öğretmen listenin neden eklenmediğini görsün.
      setNotice((current) => current ?? { kind: 'warning', message: collectMessages.nothingPasted });
      return null;
    }
    if (typedText.trim()) addTypedText(typedText);
    return toDrafts(rowsRef.current);
  }, [addPastedText, addTypedText, pasteText, typedText]);

  const hasPending = pasteText.trim().length > 0 || typedText.trim().length > 0;
  const dirty = hasPending || rows.some((r) => r.fullName.trim() || r.number.trim());

  return {
    method,
    setMethod,
    rows,
    issues,
    drafts,
    photos,
    reading,
    notice,
    dismissNotice: () => setNotice(null),
    photoAvailable,
    pasteText,
    setPasteText,
    typedText,
    setTypedText,
    addPhoto,
    removePhoto,
    addPasted,
    addTyped,
    updateRow,
    removeRow,
    hasPending,
    flush,
    dirty,
  };
}
