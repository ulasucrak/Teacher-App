import { Platform, type PressableStateCallbackType } from 'react-native';

/** Uygulama tarayıcıda (react-native-web) mı çalışıyor? */
export const isWeb = Platform.OS === 'web';

/**
 * Web'de masaüstü genişliğinde içerik bu genişliği aşmaz ve ortalanır. Masaüstü uygulama
 * sütunuyla (src/components/ui/AppFrame.web.tsx `appFrame.width`) aynıdır.
 */
export const WEB_MAX_CONTENT_WIDTH = 520;

/** Web'de alttan açılan panellerin en fazla genişliği (uygulama sütunu kadar). */
export const WEB_MAX_SHEET_WIDTH = 520;

/**
 * Fare imleci öğenin üstünde mi? RN Web Pressable durumu `hovered` da taşır (RN tiplerinde
 * yok); iOS/Android'de hep false döner.
 */
export function isHovered(state: PressableStateCallbackType): boolean {
  return Boolean((state as PressableStateCallbackType & { hovered?: boolean }).hovered);
}
