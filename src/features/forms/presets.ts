import type { IconName } from '@/components/ui';
import type { FormMode, FormOption } from '@/types/database';

export type PresetId = 'yoklama' | 'odev' | 'sozlu' | 'katilim' | 'artieksi';

export interface FormPreset {
  id: PresetId;
  title: string;
  /** Şablon kartında görünen kısa açıklama. */
  summary: string;
  /** Günde bir kez (yoklama, ödev, sözlü, katılım) ya da birikimli (artı/eksi). */
  mode: FormMode;
  options: readonly FormOption[];
  /**
   * Şablon "Birikimli" eklenirse bu puanlar seçeneklere yazılır (seçenek anahtarı → puan); net
   * böylece hemen anlamlı olur. Sayılar yeterli olan şablonlarda (yoklama, sözlü) yoktur.
   * Puanlar sonradan form düzenlemede değiştirilebilir ya da silinebilir.
   */
  repeatableScores?: Readonly<Record<string, number>>;
}

/**
 * Hazır form şablonları. Anahtarlar sabit ve ASCII'dir; kopyalanan formlarda da aynı kalır.
 * Puan yalnızca toplamın anlamlı olduğu şablonda var (artı +1, eksi −1 → net). Yoklama, ödev
 * ve katılımda sayılar ("18 Geldi, 2 Gelmedi") yeterli; sözlü notlarını toplamak anlamsız.
 */
export const PRESETS: readonly FormPreset[] = [
  {
    id: 'yoklama',
    title: 'Yoklama',
    summary: 'Derse kim geldi, kim gelmedi',
    mode: 'daily',
    options: [
      { key: 'geldi', label: 'Geldi', tone: 'positive' },
      { key: 'gelmedi', label: 'Gelmedi', tone: 'negative' },
      { key: 'gec_geldi', label: 'Geç geldi', tone: 'warning' },
      { key: 'izinli', label: 'İzinli', tone: 'neutral' },
    ],
  },
  {
    id: 'odev',
    title: 'Ödev kontrolü',
    summary: 'Ödevi getiren, eksik ya da geç getiren',
    mode: 'daily',
    options: [
      { key: 'tamamlandi', label: 'Tamamlandı', tone: 'positive' },
      { key: 'eksik', label: 'Eksik', tone: 'warning' },
      { key: 'getirmedi', label: 'Getirmedi', tone: 'negative' },
      { key: 'gec_getirdi', label: 'Geç getirdi', tone: 'warning' },
      { key: 'yapmadi', label: 'Yapmadı', tone: 'negative' },
      { key: 'gelmedi', label: 'Gelmedi', tone: 'neutral' },
    ],
    repeatableScores: { tamamlandi: 1, getirmedi: -1, yapmadi: -1 },
  },
  {
    id: 'sozlu',
    title: 'Sözlü',
    summary: '5 ile 1 arasında sözlü notu',
    mode: 'daily',
    options: [
      { key: 'puan_5', label: '5', tone: 'positive' },
      { key: 'puan_4', label: '4', tone: 'positive' },
      { key: 'puan_3', label: '3', tone: 'neutral' },
      { key: 'puan_2', label: '2', tone: 'warning' },
      { key: 'puan_1', label: '1', tone: 'negative' },
    ],
  },
  {
    id: 'katilim',
    title: 'Derse katılım',
    summary: 'Derse katılımın düzeyi',
    mode: 'daily',
    options: [
      { key: 'cok_iyi', label: 'Çok iyi', tone: 'positive' },
      { key: 'iyi', label: 'İyi', tone: 'positive' },
      { key: 'orta', label: 'Orta', tone: 'neutral' },
      { key: 'zayif', label: 'Zayıf', tone: 'negative' },
    ],
    repeatableScores: { cok_iyi: 2, iyi: 1, zayif: -1 },
  },
  {
    id: 'artieksi',
    title: 'Artı / eksi',
    summary: 'Ders içinde artı ya da eksi verin; gün içinde birikir',
    mode: 'repeatable',
    options: [
      { key: 'arti', label: 'Artı', tone: 'positive', score: 1 },
      { key: 'eksi', label: 'Eksi', tone: 'negative', score: -1 },
    ],
  },
];

/**
 * Şablon eklenirken tür seçimi: `suggested` şablonun önerdiği türü kullanır; diğerleri türü
 * zorlar (şablon "Günde bir kez" önerse de "Birikimli" eklenebilir, tersi de).
 */
export type ModeChoice = 'suggested' | FormMode;

/** Şablonun seçime göre türü ve seçenekleri (birikimli türde varsa önerilen puanlarla). */
export function presetFormValues(preset: FormPreset, choice: ModeChoice = 'suggested'): { mode: FormMode; options: FormOption[] } {
  const mode = choice === 'suggested' ? preset.mode : choice;
  const scores = mode === 'repeatable' ? preset.repeatableScores : undefined;
  const options = preset.options.map((o) => {
    const score = scores?.[o.key];
    return score === undefined || o.score !== undefined ? { ...o } : { ...o, score };
  });
  return { mode, options };
}

export function getPreset(id: string | null | undefined): FormPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}

/** Şablonun (ya da şablonla aynı adlı formun) satır ikonu. */
export function presetIcon(idOrTitle: string | null | undefined): IconName {
  const key = (idOrTitle ?? '').trim().toLocaleLowerCase('tr-TR');
  const preset = PRESETS.find((p) => p.id === key || p.title.toLocaleLowerCase('tr-TR') === key);
  switch (preset?.id) {
    case 'yoklama':
      return 'checklist';
    case 'odev':
      return 'book';
    case 'sozlu':
      return 'person';
    case 'katilim':
      return 'people';
    case 'artieksi':
      return 'plus';
    default:
      return 'list';
  }
}
