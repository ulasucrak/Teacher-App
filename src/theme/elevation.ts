import type { ViewStyle } from 'react-native';

import { colors } from './colors';

/** Yükselti seviyeleri — mürekkep tonlu gölge, yalnızca 3. ve 4. seviye. */
export const elevation: Record<'flat' | 'raised' | 'overlay', ViewStyle> = {
  flat: {},
  raised: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  overlay: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
};
