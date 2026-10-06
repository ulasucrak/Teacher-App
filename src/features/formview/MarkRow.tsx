import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { computeNet, formatCounts, formatNet, totalCount, type StudentTally } from '@/features/history';
import { colors, fontScale, layout, radii, spacing, tones } from '@/theme';
import type { FormOption } from '@/types/database';

export interface MarkRowProps {
  student: StudentTally;
  /** Görünen listedeki sıra (testID: `mark-row-<index>`). */
  index: number;
  options: readonly FormOption[];
  undoing: boolean;
  onMark: (studentId: string, optionKey: string) => void;
  onUndo: (studentId: string) => void;
}

/**
 * Birikimli formda öğrenci satırı: ad, bugünkü ve toplam sayılar, net (puanlı formda) ve her
 * seçenek için büyük bir "işaret ver" düğmesi. Tek dokunuş = bir işaret; yanındaki ok son
 * işareti geri alır. `memo`: yalnızca sayısı değişen satır yeniden çizilir.
 */
export const MarkRow = memo(function MarkRow({ student, index, options, undoing, onMark, onUndo }: MarkRowProps) {
  const testID = `mark-row-${index}`;
  const dayTotal = totalCount(student.dayCounts);
  const total = totalCount(student.counts);
  const net = computeNet(student.counts, options);

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.head}>
        <View style={styles.numberCol}>
          {student.number ? (
            <Text variant="number" tone="muted" align="right" numberOfLines={1} maxFontSizeMultiplier={1.2}>
              {student.number}
            </Text>
          ) : null}
        </View>
        <View style={styles.titles}>
          <Text variant="bodyStrong" numberOfLines={1} testID={`${testID}-name`}>
            {student.fullName}
          </Text>
          {total === 0 ? (
            <Text variant="caption" tone="muted" testID={`${testID}-empty`}>
              Henüz işaret yok
            </Text>
          ) : (
            <>
              <Text variant="caption" tone="muted" numberOfLines={2} testID={`${testID}-day`}>
                {`Bugün: ${formatCounts(student.dayCounts, options, 'işaret yok')}`}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={2} testID={`${testID}-total`}>
                {`Toplam: ${formatCounts(student.counts, options)}`}
              </Text>
            </>
          )}
        </View>
        <View
          style={styles.net}
          accessible
          accessibilityLabel={
            net !== null ? `${student.fullName}: net ${formatNet(net)}` : `${student.fullName}: toplam ${total} işaret`
          }
        >
          <Text variant="heading" align="right" testID={`${testID}-net`}>
            {net !== null ? formatNet(net) : String(total)}
          </Text>
          <Text variant="caption" tone="muted" align="right">
            {net !== null ? 'net' : 'toplam'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.buttons} accessibilityRole="toolbar" accessibilityLabel={`${student.fullName} için işaretler`}>
          {options.map((option) => (
            <MarkButton
              key={option.key}
              option={option}
              count={student.dayCounts[option.key] ?? 0}
              studentName={student.fullName}
              onPress={() => onMark(student.studentId, option.key)}
              testID={`${testID}-${option.key}`}
            />
          ))}
        </View>
        {undoing ? (
          <View style={styles.undoBusy}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <IconButton
            icon="undo"
            accessibilityLabel={`${student.fullName}: son işareti geri al`}
            accessibilityHint="Bugün verilen son işareti siler"
            onPress={() => onUndo(student.studentId)}
            disabled={dayTotal === 0}
            color={colors.textMuted}
            testID={`${testID}-undo`}
          />
        )}
      </View>
    </View>
  );
});

interface MarkButtonProps {
  option: FormOption;
  /** Bugün bu seçenekle verilen işaret sayısı. */
  count: number;
  studentName: string;
  onPress: () => void;
  testID: string;
}

function MarkButton({ option, count, studentName, onPress, testID }: MarkButtonProps) {
  const t = tones[option.tone];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${studentName}: ${option.label}`}
      accessibilityHint={count > 0 ? `Bugün ${count} kez verildi` : 'Bir işaret ekler'}
      style={({ pressed }) => [styles.markButton, { backgroundColor: pressed ? t.solid : t.soft }]}
    >
      {({ pressed }) => {
        const fg = pressed ? t.onSolid : t.onSoft;
        return (
          <>
            <Text variant="label" color={fg} numberOfLines={1} maxFontSizeMultiplier={fontScale.dense} style={styles.markLabel}>
              {option.label}
            </Text>
            {count > 0 ? (
              <View style={[styles.countBadge, { backgroundColor: t.solid }]}>
                <Text variant="caption" color={t.onSolid} maxFontSizeMultiplier={1.2}>
                  {String(count)}
                </Text>
              </View>
            ) : null}
          </>
        );
      }}
    </Pressable>
  );
}

const INDENT = layout.numberColumn + spacing.md;

const styles = StyleSheet.create({
  row: {
    paddingLeft: layout.pageX,
    paddingRight: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    backgroundColor: colors.surface,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: spacing.md, paddingRight: spacing.md },
  numberCol: { width: layout.numberColumn, marginRight: spacing.md, paddingTop: spacing.xxs },
  titles: { flex: 1, gap: spacing.xxs },
  net: { minWidth: layout.minTouch, marginLeft: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: INDENT, marginTop: spacing.sm, gap: spacing.xs },
  buttons: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  markButton: {
    flexGrow: 1,
    flexBasis: 88,
    minHeight: layout.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
  },
  markLabel: { flexShrink: 1 },
  countBadge: {
    minWidth: spacing.xl,
    height: spacing.xl,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBusy: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
});
