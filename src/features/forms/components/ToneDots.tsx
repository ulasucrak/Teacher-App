import { StyleSheet, View } from 'react-native';

import { radii, spacing, tones } from '@/theme';
import type { FormOption } from '@/types/database';

/**
 * Formun seçeneklerini sırayla, tonlarının renginde küçük noktalar olarak gösterir —
 * defter kenarına düşülmüş renkli işaretler gibi. Yalnızca görsel özet; erişilebilir
 * metin çevredeki satırda verilir.
 */
export function ToneDots({ options }: { options: readonly Pick<FormOption, 'tone' | 'key'>[] }) {
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {options.map((o, i) => (
        <View key={`${o.key}-${i}`} style={[styles.dot, { backgroundColor: tones[o.tone].solid }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radii.full },
});
