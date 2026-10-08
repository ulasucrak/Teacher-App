import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { colors, hardShadow, iconSize, layout, paper, pressedIn, radii, spacing, strokes, type PaperName } from '@/theme';

import type { ClassSummary } from '../model';

export interface ClassListRowProps {
  item: ClassSummary;
  /** Listedeki sıra: etiket bloğunun kâğıt rengi sıradan türer (`paperCycle`, sarı hariç). */
  index?: number;
  onPress: () => void;
  testID?: string;
}

/** Etiket bloğu renkleri: sarı ana eyleme (FAB) ayrıldığı için döngüde atlanır; mockup sırası nane, gök, lila, turuncu. */
const TAG_PAPERS: readonly PaperName[] = ['nane', 'gok', 'lila', 'turuncu', 'pembe'];

/**
 * "Sınıflarım" kartı (mockup `.cls`): solda renkli kâğıt etiket bloğunda sınıf adı, ortada form sayısı,
 * sağda büyük öğrenci sayısı ve chevron. Kart kalın kurşun çerçeveli, sert gölgeli; basınca gömülür.
 */
export function ClassListRow({ item, index = 0, onPress, testID }: ClassListRowProps) {
  const students = `${item.studentCount} öğrenci`;
  const forms = item.formCount > 0 ? `${item.formCount} form` : 'Henüz form yok';
  const tag = paper[TAG_PAPERS[Math.abs(index) % TAG_PAPERS.length]];
  // Uzun adlar ("Matematik kulübü") dar etiket bloğuna sığsın diye küçülür.
  const length = item.name.length;
  const nameVariant = length <= 5 ? 'title' : length <= 9 ? 'heading' : 'label';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${students}, ${forms}`}
      accessibilityHint="Sınıfı açar"
      style={({ pressed }) => [styles.card, pressed ? pressedIn('md') : hardShadow('md')]}
    >
      <View style={[styles.tag, { backgroundColor: tag }]} testID={testID ? `${testID}-tag` : undefined}>
        <Text variant={nameVariant} align="center" numberOfLines={3} maxFontSizeMultiplier={1.2}>
          {item.name}
        </Text>
      </View>
      <View style={styles.mid}>
        <Text variant="bodyStrong" numberOfLines={2}>
          {forms}
        </Text>
      </View>
      <View style={styles.count}>
        <Text variant="heading" align="right" style={styles.countNumber}>
          {String(item.studentCount)}
        </Text>
        <Text variant="caption" tone="muted" align="right">
          öğrenci
        </Text>
      </View>
      <View style={styles.chevron}>
        <Icon name="chevronRight" size={iconSize.lg} color={colors.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: layout.rowHeight + spacing.md + spacing.xxs,
    marginHorizontal: layout.pageX,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: strokes.base,
    borderColor: colors.outline,
    borderRadius: radii.md,
  },
  tag: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRightWidth: strokes.base,
    borderRightColor: colors.outline,
    borderTopLeftRadius: radii.md - strokes.base,
    borderBottomLeftRadius: radii.md - strokes.base,
  },
  mid: { flex: 1, minWidth: 0, paddingVertical: spacing.md + spacing.xxs, paddingHorizontal: spacing.md, justifyContent: 'center' },
  count: { justifyContent: 'center', paddingRight: spacing.xs },
  // Mockup `.cls .n b`: 24 pt Bricolage (`heading` 20'den bir kademe iri).
  countNumber: { fontSize: 24, lineHeight: 26 },
  chevron: { justifyContent: 'center', paddingLeft: spacing.xs, paddingRight: spacing.sm + spacing.xxs },
});
