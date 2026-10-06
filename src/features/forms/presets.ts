import type { IconName } from '@/components/ui';
import type { FormOption } from '@/types/database';

export type PresetId = 'yoklama' | 'odev' | 'sozlu' | 'katilim';

export interface FormPreset {
  id: PresetId;
  title: string;
  /** Şablon kartında görünen kısa açıklama. */
  summary: string;
  options: readonly FormOption[];
}

/** Hazır form şablonları. Anahtarlar sabit ve ASCII'dir; kopyalanan formlarda da aynı kalır. */
export const PRESETS: readonly FormPreset[] = [
  {
    id: 'yoklama',
    title: 'Yoklama',
    summary: 'Derse kim geldi, kim gelmedi',
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
    options: [
      { key: 'tamamlandi', label: 'Tamamlandı', tone: 'positive' },
      { key: 'eksik', label: 'Eksik', tone: 'warning' },
      { key: 'getirmedi', label: 'Getirmedi', tone: 'negative' },
      { key: 'gec_getirdi', label: 'Geç getirdi', tone: 'warning' },
      { key: 'yapmadi', label: 'Yapmadı', tone: 'negative' },
      { key: 'gelmedi', label: 'Gelmedi', tone: 'neutral' },
    ],
  },
  {
    id: 'sozlu',
    title: 'Sözlü',
    summary: '5 ile 1 arasında sözlü notu',
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
    options: [
      { key: 'cok_iyi', label: 'Çok iyi', tone: 'positive' },
      { key: 'iyi', label: 'İyi', tone: 'positive' },
      { key: 'orta', label: 'Orta', tone: 'neutral' },
      { key: 'zayif', label: 'Zayıf', tone: 'negative' },
    ],
  },
];

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
    default:
      return 'list';
  }
}
