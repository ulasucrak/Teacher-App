import type { ViewStyle } from 'react-native';

import { colors } from './colors';

/**
 * Yükselti seviyeleri — kurşun tonlu gölge; yalnızca ekranın üstünde yüzen öğeler
 * (alt eylem çubuğu, FAB, toast, sheet). Liste ve kartlarda gölge yok.
 */
export const elevation: Record<'flat' | 'raised' | 'floating' | 'overlay', ViewStyle> = {
  flat: {},
  /** Alt eylem çubuğu: yukarı doğru çok hafif. */
  raised: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  /** FAB: aşağı doğru, belirgin ama yumuşak. */
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  overlay: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
};
