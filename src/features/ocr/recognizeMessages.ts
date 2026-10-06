/** Fotoğraftan okuma sonuçları ve kullanıcı mesajları (mobil ve web ortak). */
import type { ParsedStudent } from './parser';

export const recognizeMessages = {
  unavailable:
    'Fotoğraftan okuma bu uygulama sürümünde yok. Expo Go yerine geliştirme derlemesini kullanın ya da öğrencileri elle ekleyin.',
  webUnavailable:
    'Fotoğraftan öğrenci ekleme yalnızca mobil uygulamada var. Burada listeyi yapıştırabilir ya da adları elle yazabilirsiniz.',
  failed: 'Fotoğraftaki yazılar okunamadı. Listeyi düz bir yüzeye koyup aydınlık bir ortamda yeniden çekin.',
  prepareFailed: 'Fotoğraf açılamadı. Başka bir fotoğraf seçin ya da yeniden çekin.',
} as const;

export type RecognizeOutcome =
  | { ok: true; students: ParsedStudent[]; uri: string }
  | { ok: false; reason: keyof typeof recognizeMessages; message: string };

export function recognizeFailure(reason: keyof typeof recognizeMessages): RecognizeOutcome {
  return { ok: false, reason, message: recognizeMessages[reason] };
}
