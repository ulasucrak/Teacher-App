import Foundation
import ImageIO
import Vision

/// Vision'ın bir satır (gözlem) için verdiği ham sonuç. `x/y/width/height` Vision'ın
/// normalize (0...1), SOL-ALT orijinli sınırlayıcı kutusudur; piksele ve sol-üst
/// orijine JS tarafında çevrilir (src/features/ocr/vision.ts).
struct VisionTextObservation {
  let text: String
  let confidence: Float
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct VisionTextResult {
  /// EXIF yönü uygulanmış (dik) görüntünün piksel boyutu; kutular bu görüntüye göredir.
  let width: Int
  let height: Int
  let observations: [VisionTextObservation]
}

enum VisionTextReaderError: Error {
  case imageNotFound
  case imageDecodeFailed
  case recognitionFailed(String)
}

/// Yalnızca Foundation/ImageIO/Vision kullanır (UIKit ya da Expo yok): hem iOS modülü
/// hem de macOS'ta bağımsız kalite ölçümü aynı kodu derler.
enum VisionTextReader {
  static func recognize(
    uri: String,
    languages: [String],
    usesLanguageCorrection: Bool
  ) throws -> VisionTextResult {
    // Büyük fotoğrafın çözülmüş pikselleri ve Vision ara nesneleri çağrı biter bitmez bırakılsın
    // (AsyncFunction arka plan kuyruğunda çalışır; orada otomatik bir autorelease havuzu yok).
    try autoreleasepool {
      try recognizeImage(uri: uri, languages: languages, usesLanguageCorrection: usesLanguageCorrection)
    }
  }

  private static func recognizeImage(
    uri: String,
    languages: [String],
    usesLanguageCorrection: Bool
  ) throws -> VisionTextResult {
    let url = fileURL(from: uri)
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
      throw VisionTextReaderError.imageNotFound
    }
    guard let cgImage = CGImageSourceCreateImageAtIndex(source, 0, [kCGImageSourceShouldCache: false] as CFDictionary) else {
      throw VisionTextReaderError.imageDecodeFailed
    }

    // CGImage ham (döndürülmemiş) pikselleri verir; EXIF yönü Vision'a iletilir ve
    // kutular dik görüntüye göre döner. Yönler 5...8 en/boy değiştirir.
    let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    let rawOrientation = (properties?[kCGImagePropertyOrientation] as? NSNumber)?.uint32Value ?? 1
    let orientation = CGImagePropertyOrientation(rawValue: rawOrientation) ?? .up
    let swapsAxes = (5...8).contains(rawOrientation)

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = usesLanguageCorrection
    // Dil otomatik algılanmasın: liste her zaman Türkçe; algılama Latin adlarda yanlış dil
    // modeli seçip harf düzeltmesini bozabilir.
    if #available(iOS 16.0, macOS 13.0, *) {
      request.automaticallyDetectsLanguage = false
    }
    // İstenen diller bu cihazın Vision sürümünde yoksa (eski iOS) varsayılana düşülür.
    let supported = (try? request.supportedRecognitionLanguages()) ?? []
    let usable = languages.filter { supported.contains($0) }
    if !usable.isEmpty { request.recognitionLanguages = usable }

    do {
      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
      try handler.perform([request])
    } catch {
      throw VisionTextReaderError.recognitionFailed(error.localizedDescription)
    }

    let observations: [VisionTextObservation] = (request.results ?? []).compactMap { observation in
      guard let candidate = observation.topCandidates(1).first else { return nil }
      let box = observation.boundingBox
      return VisionTextObservation(
        text: candidate.string,
        confidence: candidate.confidence,
        x: Double(box.origin.x),
        y: Double(box.origin.y),
        width: Double(box.size.width),
        height: Double(box.size.height)
      )
    }

    return VisionTextResult(
      width: swapsAxes ? cgImage.height : cgImage.width,
      height: swapsAxes ? cgImage.width : cgImage.height,
      observations: observations
    )
  }

  /// "file:///..." (expo-image-manipulator/-picker çıktısı) ya da düz yol.
  private static func fileURL(from uri: String) -> URL {
    if let url = URL(string: uri), url.isFileURL { return url }
    return URL(fileURLWithPath: uri)
  }
}
