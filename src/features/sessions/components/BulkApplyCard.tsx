import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Icon, OptionGrid, Text } from '@/components/ui';
import { colors, layout, radii, spacing } from '@/theme';
import type { FormOption } from '@/types/database';

export interface BulkApplyCardProps {
  options: readonly FormOption[];
  studentCount: number;
  /** Herkes aynı seçenekteyse o seçenek (seçili görünür). */
  uniformOption: string | null;
  /** null → herkesin seçimini temizle. */
  onApply: (optionKey: string | null) => void;
  disabled?: boolean;
}

/** "Tümü" kartı: bir seçeneği tüm öğrencilere uygular. Seçili seçeneğe tekrar dokunmak temizler. */
export const BulkApplyCard = memo(function BulkApplyCard({
  options,
  studentCount,
  uniformOption,
  onApply,
  disabled,
}: BulkApplyCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Icon name="people" size={18} color={colors.primary} />
        </View>
        <Text variant="bodyStrong" style={styles.title}>
          Tümü
        </Text>
        <Text variant="caption" tone="muted">
          {studentCount} öğrenci
        </Text>
      </View>
      <OptionGrid
        options={options}
        value={uniformOption}
        disabled={disabled}
        contextLabel="Tüm öğrenciler"
        onChange={(key) => onApply(uniformOption === key ? null : key)}
      />
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: {
    width: layout.minTouch - spacing.lg,
    height: layout.minTouch - spacing.lg,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1 },
});
