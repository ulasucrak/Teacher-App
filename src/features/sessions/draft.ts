/**
 * Kayıt doldurma ekranının taslak durumu (saf, test edilebilir).
 *
 * `saved` sunucudaki son hâli, `draft` ekranda görüneni tutar. Değişmeyen öğrencilerin
 * değer nesneleri aynı kimlikte kalır; böylece `memo`'lu satırlar yeniden çizilmez.
 */
import type { FormEntryRow, FormOption } from '@/types/database';

export interface EntryValue {
  optionKey: string | null;
  note: string | null;
}

export type EntryMap = Readonly<Record<string, EntryValue>>;

export interface BulkUndo {
  /** Toplu işlemden önceki taslak (geri almada aynen geri yüklenir). */
  previous: EntryMap;
  /** Uygulanan seçenek; null → toplu temizleme. */
  optionKey: string | null;
  count: number;
}

export interface DraftState {
  saved: EntryMap;
  draft: EntryMap;
  undo: BulkUndo | null;
}

export type DraftAction =
  | { type: 'load'; entries: readonly Pick<FormEntryRow, 'student_id' | 'option_key' | 'note'>[] }
  /** Aynı seçeneğe tekrar dokunmak seçimi temizler. */
  | { type: 'toggle'; studentId: string; optionKey: string }
  | { type: 'clear'; studentId: string }
  | { type: 'setNote'; studentId: string; note: string | null }
  /** Verilen öğrencilerin hepsine seçeneği uygular (null → temizler). */
  | { type: 'bulkApply'; studentIds: readonly string[]; optionKey: string | null }
  | { type: 'undoBulk' }
  | { type: 'dismissUndo' }
  /** Kayıt başarılı: gönderilen değerler artık "saved". */
  | { type: 'saved'; entries: readonly UpsertEntry[] };

export interface UpsertEntry {
  session_id: string;
  student_id: string;
  option_key: string | null;
  note: string | null;
}

export const EMPTY_ENTRY: EntryValue = Object.freeze({ optionKey: null, note: null });

export const initialDraftState: DraftState = { saved: {}, draft: {}, undo: null };

/** Boş/boşluk not → null; diğerleri kırpılır. */
export function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}

function sameEntry(a: EntryValue | undefined, b: EntryValue | undefined): boolean {
  const x = a ?? EMPTY_ENTRY;
  const y = b ?? EMPTY_ENTRY;
  return x.optionKey === y.optionKey && x.note === y.note;
}

function withEntry(map: EntryMap, studentId: string, next: EntryValue): EntryMap {
  if (sameEntry(map[studentId], next)) return map;
  return { ...map, [studentId]: next };
}

export function getEntry(map: EntryMap, studentId: string): EntryValue {
  return map[studentId] ?? EMPTY_ENTRY;
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  switch (action.type) {
    case 'load': {
      const map: Record<string, EntryValue> = {};
      for (const e of action.entries) {
        map[e.student_id] = { optionKey: e.option_key, note: normalizeNote(e.note) };
      }
      return { saved: map, draft: map, undo: null };
    }
    case 'toggle': {
      const current = getEntry(state.draft, action.studentId);
      const optionKey = current.optionKey === action.optionKey ? null : action.optionKey;
      const draft = withEntry(state.draft, action.studentId, { ...current, optionKey });
      return draft === state.draft && !state.undo ? state : { ...state, draft, undo: null };
    }
    case 'clear': {
      const current = getEntry(state.draft, action.studentId);
      const draft = withEntry(state.draft, action.studentId, { ...current, optionKey: null });
      return draft === state.draft ? state : { ...state, draft, undo: null };
    }
    case 'setNote': {
      const current = getEntry(state.draft, action.studentId);
      const draft = withEntry(state.draft, action.studentId, { ...current, note: normalizeNote(action.note) });
      return draft === state.draft ? state : { ...state, draft, undo: null };
    }
    case 'bulkApply': {
      let draft = state.draft;
      let count = 0;
      for (const id of action.studentIds) {
        const current = getEntry(draft, id);
        const next = withEntry(draft, id, { ...current, optionKey: action.optionKey });
        if (next !== draft) count += 1;
        draft = next;
      }
      if (count === 0) return state;
      return {
        ...state,
        draft,
        undo: { previous: state.draft, optionKey: action.optionKey, count },
      };
    }
    case 'undoBulk':
      return state.undo ? { ...state, draft: state.undo.previous, undo: null } : state;
    case 'dismissUndo':
      return state.undo ? { ...state, undo: null } : state;
    case 'saved': {
      let saved = state.saved;
      for (const e of action.entries) {
        saved = withEntry(saved, e.student_id, { optionKey: e.option_key, note: e.note });
      }
      return { ...state, saved, undo: null };
    }
  }
}

/** Kaydedilmemiş değişikliği olan öğrenciler (taslak ≠ kayıtlı). */
export function getDirtyStudentIds(state: DraftState): string[] {
  const ids = new Set([...Object.keys(state.draft), ...Object.keys(state.saved)]);
  return [...ids].filter((id) => !sameEntry(state.draft[id], state.saved[id]));
}

/** Yalnızca değişen satırlar için upsert yükü (session_id, student_id çakışmasında güncellenir). */
export function buildUpsertPayload(state: DraftState, sessionId: string): UpsertEntry[] {
  return getDirtyStudentIds(state).map((studentId) => {
    const entry = getEntry(state.draft, studentId);
    return { session_id: sessionId, student_id: studentId, option_key: entry.optionKey, note: entry.note };
  });
}

/**
 * Her seçenek için taslaktaki sayım + seçimsiz öğrenci sayısı. Formda artık bulunmayan
 * eski anahtarlar boş sayılmaz, toplamda yer almaz.
 */
export function countByOption(
  state: Pick<DraftState, 'draft'>,
  studentIds: readonly string[],
  options: readonly FormOption[],
): { counts: Record<string, number>; empty: number } {
  const counts: Record<string, number> = {};
  for (const o of options) counts[o.key] = 0;
  let empty = 0;
  for (const id of studentIds) {
    const key = state.draft[id]?.optionKey ?? null;
    if (key === null) empty += 1;
    else if (key in counts) counts[key] += 1;
  }
  return { counts, empty };
}

/** "Tümü" kartında seçili görünecek seçenek: herkes aynı seçenekteyse o, değilse null. */
export function getUniformOption(state: Pick<DraftState, 'draft'>, studentIds: readonly string[]): string | null {
  if (studentIds.length === 0) return null;
  const first = state.draft[studentIds[0]]?.optionKey ?? null;
  if (first === null) return null;
  for (const id of studentIds) {
    if ((state.draft[id]?.optionKey ?? null) !== first) return null;
  }
  return first;
}
