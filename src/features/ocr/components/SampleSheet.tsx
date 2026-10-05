import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';

/** e-Okul listesinden okunan sütunlar → defterdeki karşılığı. Sabit örnek; gerçek veri değil. */
const SAMPLE = [
  { number: '112', name: 'Selin Bayezit' },
  { number: '245', name: 'Mehmet Ali Kara' },
  { number: '307', name: 'Zeynep Çelik' },
];

/**
 * "Liste böyle okunur" önizlemesi: okul numarası kırmızı kenar çizgisinin solunda,
 * ad soyad sağında — tıpkı sınıf defterindeki gibi. Sıra no ve cinsiyet okunmaz.
 */
export function SampleSheet() {
  return (
    <View
      style={styles.sheet}
      accessible
      accessibilityLabel="Örnek: okul numarası ve ad soyad okunur, sıra numarası ve cinsiyet atlanır."
    >
      <View style={styles.headRow}>
        <View style={styles.numberCell}>
          <Text variant="caption" tone="muted" align="right" maxFontSizeMultiplier={1.2}>
            No
          </Text>
        </View>
        <View style={styles.rule} />
        <Text variant="caption" tone="muted" style={styles.nameCell} maxFontSizeMultiplier={1.2}>
          Ad soyad
        </Text>
      </View>
      {SAMPLE.map((s) => (
        <View key={s.number} style={styles.row}>
          <View style={styles.numberCell}>
            <Text variant="number" tone="muted" align="right" maxFontSizeMultiplier={1.2}>
              {s.number}
            </Text>
          </View>
          <View style={styles.rule} />
          <Text variant="body" style={styles.nameCell} numberOfLines={1}>
            {s.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: radii.md,
    borderWidth: layout.hairline,
    borderColor: colors.rule,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  headRow: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: colors.surfaceMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: layout.hairline,
    borderTopColor: colors.rule,
  },
  numberCell: {
    width: layout.numberColumn + spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  rule: { width: layout.marginRuleWidth, backgroundColor: colors.marginRule },
  nameCell: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
