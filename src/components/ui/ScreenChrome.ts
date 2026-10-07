import { Platform, useWindowDimensions } from 'react-native';

import { iconSize, spacing } from '@/theme';

import { appFrameMode } from './AppFrame.web';

const isWeb = Platform.OS === 'web';

/**
 * Masaüstü web'de (uygulama ortalı bir kart içinde) üst çubuğa eklenen boşluk: iOS'taki durum
 * çubuğu boşluğu olmadığından çubuk kartın üst kenarına yapışmasın.
 */
export const desktopBarInset = spacing.sm;

/** Web'deki Material ‹ glifi kutusuna göre küçük; iOS'taki chevron.left boyuna yaklaştırır. */
export const backIconSize = isWeb ? iconSize.xxl + spacing.xxs : iconSize.xl;

/** Web'de uygulama masaüstü çerçevesinde mi (dar/mobil tarayıcıda ve native'de false). */
export function useDesktopWeb(): boolean {
  const { width, height } = useWindowDimensions();
  return isWeb && appFrameMode(width, height) !== 'full';
}
