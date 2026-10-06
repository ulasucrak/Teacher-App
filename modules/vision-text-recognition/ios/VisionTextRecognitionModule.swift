import ExpoModulesCore

internal final class VisionImageNotFoundException: Exception {
  override var reason: String {
    "Image cannot be found or opened"
  }
}

internal final class VisionImageDecodeException: Exception {
  override var reason: String {
    "Image cannot be decoded"
  }
}

internal final class VisionRecognitionFailedException: GenericException<String> {
  override var reason: String {
    "Text recognition failed: \(param)"
  }
}

public class VisionTextRecognitionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VisionTextRecognition")

    // Dönüş: { width, height, observations: [{ text, confidence, x, y, width, height }] }
    // Kutular normalize ve sol-alt orijinlidir; JS tarafı ML Kit biçimine çevirir.
    AsyncFunction("recognize") { (uri: String, languages: [String], usesLanguageCorrection: Bool) -> [String: Any] in
      do {
        let result = try VisionTextReader.recognize(
          uri: uri,
          languages: languages,
          usesLanguageCorrection: usesLanguageCorrection
        )
        return [
          "width": result.width,
          "height": result.height,
          "observations": result.observations.map { observation -> [String: Any] in
            [
              "text": observation.text,
              "confidence": Double(observation.confidence),
              "x": observation.x,
              "y": observation.y,
              "width": observation.width,
              "height": observation.height,
            ]
          },
        ]
      } catch VisionTextReaderError.imageNotFound {
        throw VisionImageNotFoundException()
      } catch VisionTextReaderError.imageDecodeFailed {
        throw VisionImageDecodeException()
      } catch VisionTextReaderError.recognitionFailed(let message) {
        throw VisionRecognitionFailedException(message)
      }
    }
  }
}
