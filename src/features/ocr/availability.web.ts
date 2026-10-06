import { recognizeMessages } from './recognizeMessages';

/** Web: fotoğraftan okuma yalnızca mobil uygulamada var; liste yapıştırma ve elle ekleme açık. */
export function photoImportUnavailableMessage(): string | null {
  return recognizeMessages.webUnavailable;
}
