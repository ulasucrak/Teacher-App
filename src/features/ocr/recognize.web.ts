/**
 * Web sürümü: tarayıcıda cihaz üstü metin tanıma (Apple Vision / ML Kit) yoktur.
 * recognize.ts ile aynı dışa aktarımları verir; yerel modüller web paketine girmez.
 * Fotoğraf yolu web'de kapalıdır (availability.web.ts); liste yapıştırma ve elle ekleme çalışır.
 */
import type { OcrResult } from './parser';
import { recognizeFailure, type RecognizeOutcome } from './recognizeMessages';

export { recognizeMessages } from './recognizeMessages';
export type { RecognizeOutcome } from './recognizeMessages';

export const OCR_MAX_WIDTH = 2000;

export type TextReader = (uri: string) => Promise<OcrResult>;

export function isModuleUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /doesn't seem to be linked|not linked|native module|cannot read propert(y|ies) of (undefined|null)/i.test(message);
}

export function loadTextRecognition(): null {
  return null;
}

export function loadVision(): null {
  return null;
}

export function loadTextReader(): TextReader | null {
  return null;
}

export function isExpoGo(): boolean {
  return false;
}

/** Web'de fotoğraf işlenmez; adres olduğu gibi döner. */
export async function preparePhoto(uri: string): Promise<string> {
  return uri;
}

export async function recognizePhoto(): Promise<RecognizeOutcome> {
  return recognizeFailure('webUnavailable');
}
