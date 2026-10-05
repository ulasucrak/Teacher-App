/**
 * Apple Vision çıktısını ML Kit `TextRecognitionResult` biçimine (parser.ts'in beklediği
 * OcrResult) çevirir. Saf modül: yerel modül ya da React bağımlılığı yok.
 *
 * Vision her satır için normalize (0...1) ve SOL-ALT orijinli bir kutu verir; ML Kit
 * ise piksel cinsinden ve SOL-ÜST orijinli kutu verir. Dönüşüm:
 *   left = x * W,  top = (1 - y - height) * H,  width = w * W,  height = h * H
 * Her gözlem tek satırlı ayrı bir blok olur (Vision blok kavramı sunmaz; parser satırları
 * dikey konuma göre yeniden birleştirir).
 */
import type { VisionRecognitionOptions, VisionRecognitionResult } from '../../../modules/vision-text-recognition';
import type { OcrResult } from './parser';

/**
 * Vision ayarları. macOS'ta Türkçe karakterli 20 adlık, 10 görüntülük (düz yazı, fotoğraf
 * bozulması, el yazısı benzeri) kıyaslamada:
 * - Diller: tr-TR / en-US / ikisi birden birebir aynı sonucu verdi (Vision'ın Latin harfli
 *   modeli dilden bağımsız). "tr-TR" yine de belirtilir: amaç belli olur, dile duyarlı bir
 *   Vision sürümünde doğru model seçilir; sürüm Türkçeyi bilmiyorsa native taraf varsayılana düşer.
 * - Dil düzeltmesi açık: kapalıya göre eşit ya da biraz daha iyi (özellikle el yazısında;
 *   toplam 144 / 200 ad, kapalıyken 141 / 200). Adların sözlükteki sözcüğe "düzeltilmesi" görülmedi.
 */
export const VISION_OPTIONS: VisionRecognitionOptions = {
  languages: ['tr-TR'],
  usesLanguageCorrection: true,
};

export function visionToOcrResult(raw: VisionRecognitionResult): OcrResult {
  const { width, height } = raw;
  const blocks = raw.observations
    .filter((o) => o.text.trim().length > 0)
    .map((o) => {
      const frame = {
        left: o.x * width,
        top: (1 - o.y - o.height) * height,
        width: o.width * width,
        height: o.height * height,
      };
      return { text: o.text, lines: [{ text: o.text, frame }] };
    });
  return { text: blocks.map((b) => b.text).join('\n'), blocks };
}
