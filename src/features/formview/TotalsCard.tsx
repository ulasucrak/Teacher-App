import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { spacing } from '@/theme';

interface TotalsCardProps {
  /** "Sınıf toplamı". */
  title: string;
  /** Sayımlar (ToneCounts ya da metin) ve varsa ek satırlar. */
  children: ReactNode;
  /** Biçimlenmiş net ("+12"); puansız formda verilmez. */
  net?: string | null;
  netAccessibilityLabel?: string;
  testID?: string;
  netTestID?: string;
}

/**
 * Dönem / gün toplamı: nane kâğıt kart (mockup'un kâğıt blokları gibi), solda sayımlar, sağda iri net sayı
 * (`display`). Geçmiş > Özet ve Gün görünümlerinde ortaktır.
 */
export function TotalsCard({ title, children, net, netAccessibilityLabel, testID, netTestID }: TotalsCardProps) {
  return (
    <Card variant="paper" paper="nane" shadowSize="md" style={styles.card} testID={testID}>
      <View style={styles.text}>
        <Text variant="label">{title}</Text>
        {children}
      </View>
      {net ? (
        <View accessible accessibilityLabel={netAccessibilityLabel} style={styles.net}>
          <Text variant="display" align="right" testID={netTestID} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {net}
          </Text>
          <Text variant="caption" align="right">
            net
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  text: { flex: 1, gap: spacing.xs },
  net: { alignItems: 'flex-end' },
});
