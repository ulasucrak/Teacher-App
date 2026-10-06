/**
 * Cihaz üstü metin tanıma (ücretsiz, çevrimdışı). iOS'ta Apple Vision
 * (modules/vision-text-recognition), Android'de ML Kit. Yalnızca geliştirme
 * derlemesinde çalışır; Expo Go'da yerel modüller yoktur.
 *
 * Yerel modüller tembel yüklenir: iOS'ta ML Kit hiç bağlanmaz (react-native.config.js),
 * Expo Go'da hiçbiri yoktur; eksiklik açılışta çökertmez, kullanıcıya gösterilen
 * "kullanılamıyor" yoluna düşer.
 */
import type TextRecognitionDefault from '@react-native-ml-kit/text-recognition';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { NativeModules, Platform } from 'react-native';

import { parseOcrResult, type OcrResult } from './parser';
import { recognizeFailure as fail, type RecognizeOutcome } from './recognizeMessages';
import { VISION_OPTIONS, visionToOcrResult } from './vision';

export { recognizeMessages } from './recognizeMessages';
export type { RecognizeOutcome } from './recognizeMessages';

/** OCR için yeterli ve hızlı genişlik. */
export const OCR_MAX_WIDTH = 2000;

/** Yerel modülün bağlı olmadığını gösteren hata mı? */
export function isModuleUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /doesn't seem to be linked|not linked|native module|cannot read propert(y|ies) of (undefined|null)/i.test(message);
}

type TextRecognitionModule = typeof TextRecognitionDefault;
type VisionModule = typeof import('../../../modules/vision-text-recognition');

/** Fotoğraftaki yazıları ML Kit uyumlu OcrResult olarak döndüren okuyucu. */
export type TextReader = (uri: string) => Promise<OcrResult>;

/* eslint-disable @typescript-eslint/no-require-imports -- tembel yükleme (dosya başındaki nota bakın) */

/**
 * ML Kit modülünü (Android) yalnızca yerel taraf bağlıysa ve ihtiyaç anında yükler.
 * Modül yoksa (Expo Go, iOS) `null` döner; dosya yüklenirken hiçbir şey çökmez.
 */
export function loadTextRecognition(): TextRecognitionModule | null {
  if (!NativeModules.TextRecognition) return null;
  try {
    const mod = require('@react-native-ml-kit/text-recognition') as { default?: TextRecognitionModule };
    return mod.default ?? null;
  } catch {
    return null;
  }
}

/** Apple Vision modülünü (iOS) yükler; yerel taraf bağlı değilse `null`. */
export function loadVision(): VisionModule | null {
  try {
    const mod = require('../../../modules/vision-text-recognition') as VisionModule;
    return mod.isVisionAvailable() ? mod : null;
  } catch {
    return null;
  }
}

/* eslint-enable @typescript-eslint/no-require-imports */

/** Platformun metin okuyucusu: iOS'ta Vision, Android'de ML Kit. Bağlı değilse `null`. */
export function loadTextReader(): TextReader | null {
  if (Platform.OS === 'ios') {
    const vision = loadVision();
    if (!vision) return null;
    return async (uri) => visionToOcrResult(await vision.recognizeText(uri, VISION_OPTIONS));
  }
  const mlkit = loadTextRecognition();
  if (!mlkit) return null;
  return (uri) => mlkit.recognize(uri);
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

/** Fotoğrafı küçültür, platformun tanıyıcısıyla okur ve öğrenci satırlarına çevirir. */
export async function recognizePhoto(uri: string, width?: number): Promise<RecognizeOutcome> {
  if (isExpoGo()) return fail('unavailable');
  const readText = loadTextReader();
  if (!readText) return fail('unavailable');

  let prepared: string;
  try {
    prepared = await preparePhoto(uri, width);
  } catch {
    return fail('prepareFailed');
  }

  try {
    const result = await readText(prepared);
    return { ok: true, students: parseOcrResult(result), uri: prepared };
  } catch (error) {
    return fail(isModuleUnavailableError(error) ? 'unavailable' : 'failed');
  }
}
