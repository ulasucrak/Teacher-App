import { isExpoGo, recognizeMessages } from './recognize';

/**
 * Fotoğraftan öğrenci ekleme bu ortamda kullanılamıyorsa kullanıcıya gösterilecek açıklama;
 * kullanılabiliyorsa null. Mobilde yalnızca Expo Go'da kapalıdır (web: availability.web.ts).
 */
export function photoImportUnavailableMessage(): string | null {
  return isExpoGo() ? recognizeMessages.unavailable : null;
}
