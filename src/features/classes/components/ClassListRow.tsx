import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { colors, iconSize, layout, spacing } from '@/theme';

import { classMetaParts, type ClassSummary } from '../model';

export interface ClassListRowProps {
  item: ClassSummary;
  onPress: () => void;
}

/**
 * Sınıf listesi satırı (seviye 0, defter satırı): solda sınıf adı büyük, altında düzey ve
 * şube; sağda öğrenci ve form sayıları ayrı satırlarda.
 */
export function ClassListRow({ item, onPress }: ClassListRowProps) {
  const meta = classMetaParts(item);
  const students = `${item.studentCount} öğrenci`;
  const forms = `${item.formCount} form`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[item.name, ...meta, students, forms].join(', ')}
      accessibilityHint="Sınıfın öğrencilerini ve formlarını açar"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <Text variant="heading" numberOfLines={2}>
          {item.name}
        </Text>
        {meta.length > 0 ? (
          <View style={styles.meta}>
            {meta.map((part) => (
              <Text key={part} variant="caption" tone="muted">
                {part}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.counts}>
        <Text variant="label" align="right">
          {students}
        </Text>
        <Text variant="caption" tone="muted" align="right">
          {forms}
        </Text>
      </View>
      <Icon name="chevronRight" size={iconSize.sm} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: layout.minTouch + spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: layout.pageX,
    backgroundColor: colors.surface,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  main: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  counts: { alignItems: 'flex-end', gap: spacing.xxs },
});
