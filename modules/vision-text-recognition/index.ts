/**
 * Apple Vision ile fotoğraftan metin okuma (yalnızca iOS; yerel Swift kodu ios/ altında).
 * Android bu modülü kullanmaz (ML Kit). Modül Expo Go'da (ve Android'de) yoktur:
 * `isVisionAvailable()` false döner ve `recognizeText` "Cannot find native module" hatasıyla
 * reddeder; çağıran (src/features/ocr/recognize.ts) bunu "kullanılamıyor" olarak ele alır.
 */
import { requireOptionalNativeModule } from 'expo';

/** Vision'ın bir satır (gözlem) için ham sonucu. Kutu normalize (0...1) ve SOL-ALT orijinlidir. */
export interface VisionObservation {
  text: string;
  /** 0...1 */
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionRecognitionResult {
  /** EXIF yönü uygulanmış (dik) görüntünün piksel boyutu; kutular bu görüntüye göredir. */
  width: number;
  height: number;
  observations: VisionObservation[];
}

export interface VisionRecognitionOptions {
  /** Vision dil kodları, öncelik sırasıyla (ör. ["tr-TR"]). Cihazda yoksa varsayılana düşülür. */
  languages: string[];
  usesLanguageCorrection: boolean;
}

interface VisionTextRecognitionNativeModule {
  recognize(uri: string, languages: string[], usesLanguageCorrection: boolean): Promise<VisionRecognitionResult>;
}

const NativeModule = requireOptionalNativeModule<VisionTextRecognitionNativeModule>('VisionTextRecognition');

/** Yerel Vision modülü bu derlemede bağlı mı? */
export function isVisionAvailable(): boolean {
  return NativeModule != null;
}

/** `file://` adresindeki fotoğrafı okur (recognitionLevel .accurate). */
export function recognizeText(uri: string, options: VisionRecognitionOptions): Promise<VisionRecognitionResult> {
  if (!NativeModule) return Promise.reject(new Error("Cannot find native module 'VisionTextRecognition'"));
  return NativeModule.recognize(uri, options.languages, options.usesLanguageCorrection);
}
