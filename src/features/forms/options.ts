import type { FormOption, FormOptionTone } from '@/types/database';

/** Bir formda olabilecek en az / en çok seçenek sayısı ve etiket uzunluğu. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 12;
export const MAX_LABEL_LENGTH = 24;
export const MAX_TITLE_LENGTH = 60;

export const TONE_ORDER: readonly FormOptionTone[] = ['positive', 'neutral', 'warning', 'negative'];

/** Ton adları (ekran okuyucu ve seçici için). */
export const toneLabels: Record<FormOptionTone, string> = {
  positive: 'Olumlu',
  neutral: 'Nötr',
  warning: 'Uyarı',
  negative: 'Olumsuz',
};

/**
 * Düzenleyicideki seçenek taslağı. `key` kaydedilmiş seçenekte sabittir (eski kayıtlar
 * ona bağlı); yeni seçenekte `null` olur ve kaydederken bir kez üretilir.
 * `id` yalnızca liste içi kimliktir (React anahtarı).
 */
export interface DraftOption {
  id: string;
  key: string | null;
  label: string;
  tone: FormOptionTone;
}

const TR_ASCII: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
  â: 'a',
  Â: 'a',
  î: 'i',
  Î: 'i',
  û: 'u',
  Û: 'u',
};

/** "Geç getirdi" → "gec_getirdi". Türkçe harfler ASCII'ye çevrilir; boşsa "secenek". */
export function slugify(label: string): string {
  const ascii = Array.from(label.trim())
    .map((ch) => TR_ASCII[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return ascii.slice(0, 40).replace(/_+$/g, '') || 'secenek';
}

/** `base` kullanılmıyorsa onu, kullanılıyorsa `base_2`, `base_3`… döndürür. */
export function uniqueKey(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/** Karşılaştırma için etiket: boşluklar sadeleşir, Türkçe küçük harf. */
export function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

let draftCounter = 0;
function nextDraftId(): string {
  draftCounter += 1;
  return `draft-${draftCounter}`;
}

export function toDraftOptions(options: readonly FormOption[]): DraftOption[] {
  return options.map((o) => ({ id: nextDraftId(), key: o.key, label: o.label, tone: o.tone }));
}

/** Şablon seçenekleri yeni form içindir: anahtarlar kaydederken üretilir. */
export function toNewDraftOptions(options: readonly Pick<FormOption, 'label' | 'tone'>[]): DraftOption[] {
  return options.map((o) => ({ id: nextDraftId(), key: null, label: o.label, tone: o.tone }));
}

export function createDraftOption(tone: FormOptionTone = 'neutral'): DraftOption {
  return { id: nextDraftId(), key: null, label: '', tone };
}

/** Sırayı bir adım yukarı (-1) ya da aşağı (+1) taşır; sınırdaysa aynı diziyi döndürür. */
export function moveOption<T>(list: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}

/**
 * Taslakları kaydedilecek seçeneklere çevirir. Var olan anahtarlar korunur
 * (etiket değişse bile); yeni seçeneklere etiketten bir kez anahtar üretilir.
 */
export function finalizeOptions(drafts: readonly DraftOption[]): FormOption[] {
  const taken = new Set<string>();
  for (const d of drafts) if (d.key) taken.add(d.key);
  return drafts.map((d) => {
    const label = d.label.trim().replace(/\s+/g, ' ');
    if (d.key) return { key: d.key, label, tone: d.tone };
    const key = uniqueKey(slugify(label), taken);
    taken.add(key);
    return { key, label, tone: d.tone };
  });
}

export interface FormDraftValues {
  title: string;
  subject: string;
  description: string;
  options: readonly DraftOption[];
}

export interface FormValidation {
  title?: string;
  /** Liste düzeyinde hata (sayı sınırları). */
  options?: string;
  /** Seçenek `id` → hata metni. */
  optionErrors: Record<string, string>;
  valid: boolean;
}

export function validateForm(values: FormDraftValues): FormValidation {
  const result: FormValidation = { optionErrors: {}, valid: true };
  const title = values.title.trim();
  if (!title) {
    result.title = 'Form adı boş olamaz. Örneğin "Yoklama" ya da "Ödev kontrolü" yazın.';
  } else if (title.length > MAX_TITLE_LENGTH) {
    result.title = `Form adı en fazla ${MAX_TITLE_LENGTH} karakter olabilir. Daha kısa bir ad yazın.`;
  }

  const count = values.options.length;
  if (count < MIN_OPTIONS) {
    result.options = `En az ${MIN_OPTIONS} seçenek gerekir. "Seçenek ekle" ile yeni seçenek ekleyin.`;
  } else if (count > MAX_OPTIONS) {
    result.options = `En fazla ${MAX_OPTIONS} seçenek olabilir. Kullanmadıklarınızı kaldırın.`;
  }

  const seen = new Map<string, string>();
  for (const option of values.options) {
    const normalized = normalizeLabel(option.label);
    if (!normalized) {
      result.optionErrors[option.id] = 'Seçenek adı boş olamaz. Bir ad yazın ya da seçeneği kaldırın.';
    } else if (option.label.trim().length > MAX_LABEL_LENGTH) {
      result.optionErrors[option.id] = `En fazla ${MAX_LABEL_LENGTH} karakter yazın; çipte kısa ad okunur.`;
    } else if (seen.has(normalized)) {
      result.optionErrors[option.id] = 'Bu ad başka bir seçenekte de var. Farklı bir ad yazın.';
    } else {
      seen.set(normalized, option.id);
    }
  }

  result.valid = !result.title && !result.options && Object.keys(result.optionErrors).length === 0;
  return result;
}

/** Düzenlemede kaldırılan (kaydedilmiş) seçenekler: eski kayıtlar etiketsiz kalır. */
export function removedOptions(original: readonly FormOption[], drafts: readonly DraftOption[]): FormOption[] {
  const kept = new Set(drafts.map((d) => d.key).filter((k): k is string => Boolean(k)));
  return original.filter((o) => !kept.has(o.key));
}

/** Ham jsonb değerini güvenle FormOption[]'a çevirir (bozuk öğeler atlanır). */
export function parseOptions(value: unknown): FormOption[] {
  if (!Array.isArray(value)) return [];
  const out: FormOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { key, label, tone } = item as Record<string, unknown>;
    if (typeof key !== 'string' || typeof label !== 'string') continue;
    if (typeof tone !== 'string' || !(TONE_ORDER as readonly string[]).includes(tone)) continue;
    out.push({ key, label, tone: tone as FormOptionTone });
  }
  return out;
}
