/**
 * Cihaz üstü metin tanıma (ML Kit, ücretsiz, çevrimdışı). Yalnızca geliştirme
 * derlemesinde çalışır; Expo Go'da yerel modül yoktur.
 */
import TextRecognition from '@react-native-ml-kit/text-recognition';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { parseOcrResult, type OcrResult, type ParsedStudent } from './parser';

/** OCR için yeterli ve hızlı genişlik. */
export const OCR_MAX_WIDTH = 2000;

export const recognizeMessages = {
  unavailable:
    'Fotoğraftan okuma bu uygulama sürümünde yok. Expo Go yerine geliştirme derlemesini kullanın ya da öğrencileri elle ekleyin.',
  failed: 'Fotoğraftaki yazılar okunamadı. Listeyi düz bir yüzeye koyup aydınlık bir ortamda yeniden çekin.',
  prepareFailed: 'Fotoğraf açılamadı. Başka bir fotoğraf seçin ya da yeniden çekin.',
} as const;

export type RecognizeOutcome =
  | { ok: true; students: ParsedStudent[]; uri: string }
  | { ok: false; reason: keyof typeof recognizeMessages; message: string };

function fail(reason: keyof typeof recognizeMessages): RecognizeOutcome {
  return { ok: false, reason, message: recognizeMessages[reason] };
}

/** Yerel modülün bağlı olmadığını gösteren hata mı? */
export function isModuleUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /doesn't seem to be linked|not linked|native module|cannot read propert(y|ies) of (undefined|null)/i.test(message);
}

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Büyük fotoğrafı OCR için küçültür (genişlik ≤ 2000). Gerekmiyorsa aynı adresi döner. */
export async function preparePhoto(uri: string, width?: number): Promise<string> {
  if (width !== undefined && width > 0 && width <= OCR_MAX_WIDTH) return uri;
  const context = ImageManipulator.manipulate(uri);
  let image: Awaited<ReturnType<typeof context.renderAsync>> | null = null;
  try {
    image = await context.resize({ width: OCR_MAX_WIDTH }).renderAsync();
    const saved = await image.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
    return saved.uri;
  } finally {
    // Yerel bellekteki görüntüleri hemen bırak (kaydedilen dosya etkilenmez).
    image?.release();
    context.release();
  }
}

/** Fotoğrafı küçültür, ML Kit ile okur ve öğrenci satırlarına çevirir. */
export async function recognizePhoto(uri: string, width?: number): Promise<RecognizeOutcome> {
  if (isExpoGo()) return fail('unavailable');

  let prepared: string;
  try {
    prepared = await preparePhoto(uri, width);
  } catch {
    return fail('prepareFailed');
  }

  try {
    const result: OcrResult = await TextRecognition.recognize(prepared);
    return { ok: true, students: parseOcrResult(result), uri: prepared };
  } catch (error) {
    return fail(isModuleUnavailableError(error) ? 'unavailable' : 'failed');
  }
}
