/**
 * Autolinking ayarları (Expo autolinking bu dosyayı okur).
 *
 * ML Kit (@react-native-ml-kit/text-recognition) yalnızca Android'de bağlanır. iOS'ta
 * fotoğraftan okuma Apple Vision ile yapılır (modules/vision-text-recognition): GoogleMLKit
 * pod'ları Apple Silicon simülatörü için arm64 dilimi içermediğinden iOS simülatör hedefini
 * engelliyordu. Bu ayarı değiştirdikten sonra `cd ios && pod install` yeniden çalıştırılmalıdır.
 */
module.exports = {
  dependencies: {
    '@react-native-ml-kit/text-recognition': { platforms: { ios: null } },
  },
};
