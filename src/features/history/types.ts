import type { FormEventKind } from '@/types/database';

/** Seçenek anahtarı → adet. Sıfır olan anahtarlar yer almaz. */
export type OptionCounts = Readonly<Record<string, number>>;

/** Bir öğrencinin bir formdaki sayıları (form_tally satırı). */
export interface StudentTally {
  studentId: string;
  fullName: string;
  number: string | null;
  /** Seçilen dönemdeki sayılar. */
  counts: OptionCounts;
  /** İstenen tek günün sayıları; gün istenmediyse boş. */
  dayCounts: OptionCounts;
}

/** Doldurma ekranı için öğrencinin bugünkü ve tüm zamanlardaki sayıları. */
export interface StudentCounts {
  day: OptionCounts;
  total: OptionCounts;
}

/**
 * Geçmişteki tek olay (form_history satırı).
 * Günlük formlarda `entry_*`: eski/yeni seçenek ve not. Birikimli formlarda `mark_*`:
 * eklenen işaret `new*`, geri alınan işaret `old*` alanlarında.
 */
export interface HistoryEvent {
  /** Artan sayı; aynı anda yazılan olaylarda sırayı korur. */
  id: number;
  kind: FormEventKind;
  studentId: string;
  studentName: string;
  studentNumber: string | null;
  /** Olayın ait olduğu gün ("YYYY-MM-DD"): kaydın tarihi ya da işaretin günü. */
  eventDate: string;
  /** Olayın gerçekleştiği an (ISO, sunucu saati). */
  occurredAt: string;
  oldOptionKey: string | null;
  newOptionKey: string | null;
  oldNote: string | null;
  newNote: string | null;
  /** İşaret olaylarında işaretin kimliği. */
  markId: string | null;
  /** `mark_added` olayının işareti sonradan geri alındıysa true. */
  undone: boolean;
}

/** Sonraki sayfa için imleç: bu olaydan daha eski olanlar istenir. */
export interface HistoryCursor {
  /** Sunucudan geldiği gibi (mikrosaniye hassasiyeti korunur; Date'e çevirmeyin). */
  occurredAt: string;
  id: number;
}

export interface HistoryPage {
  /** Yeniden eskiye. */
  events: HistoryEvent[];
  /** Daha eski olay yoksa null. */
  nextCursor: HistoryCursor | null;
}
