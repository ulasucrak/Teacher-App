import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui';
import { colors, iconSize, layout, radii, spacing } from '@/theme';

/** Çoklu seçimde satır sonundaki kutu (dekoratif; durum satırın etiketinde okunur). */
export function SelectBox({ checked }: { checked: boolean }) {
  return (
    <View
      style={[styles.box, checked ? styles.checked : styles.unchecked]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {checked ? <Icon name="check" size={iconSize.sm} color={colors.textInverse} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary },
  unchecked: { borderWidth: layout.inputBorder, borderColor: colors.border, backgroundColor: colors.surface },
});
