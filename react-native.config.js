/**
 * Yalnızca geliştirme amaçlı: `NO_MLKIT=1` ile iOS'ta ML Kit metin tanıma
 * modülü otomatik bağlanmaz. GoogleMLKit pod'larında Apple Silicon simülatörü
 * (arm64) dilimi olmadığından simülatör derlemesi başka türlü alınamıyor.
 * Varsayılan (cihaz/üretim) derlemeler ve Android etkilenmez.
 */
const noMlKit = process.env.NO_MLKIT === '1';

module.exports = noMlKit
  ? {
      dependencies: {
        '@react-native-ml-kit/text-recognition': {
          platforms: { ios: null },
        },
      },
    }
  : {};
