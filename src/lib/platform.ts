import { Platform } from 'react-native';

/** Uygulama tarayıcıda (react-native-web) mı çalışıyor? */
export const isWeb = Platform.OS === 'web';

/** Web'de masaüstü genişliğinde içerik bu genişliği aşmaz ve ortalanır. */
export const WEB_MAX_CONTENT_WIDTH = 720;

/** Web'de alttan açılan panellerin en fazla genişliği. */
export const WEB_MAX_SHEET_WIDTH = 640;
