import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon, StarSticker, Text } from '@/components/ui';
import { computeNet, formatCounts, formatNet, totalCount, type StudentTally } from '@/features/history';
import { colors, fontFamilies, fontScale, hardShadow, iconSize, layout, pressedIn, radii, spacing, strokes, tones } from '@/theme';
import type { FormOption } from '@/types/database';

export interface MarkRowProps {
  student: StudentTally;
  /** Görünen listedeki sıra (testID: `mark-row-<index>`). */
  index: number;
  options: readonly FormOption[];
  undoing: boolean;
  dayLabel?: string;
  /** false: hiçbir öğrencinin numarası yok; numara sütunu ayrılmaz. */
  showNumbers?: boolean;
  onMark: (studentId: string, optionKey: string) => void;
  onUndo: (studentId: string) => void;
}

/** Ad altında en çok bu kadar yıldız çıkartması dizilir (kalanı "Bugün +N" metninde). */
const MAX_STICKERS = 3;

/**
 * Birikimli formda öğrenci satırı (mockup `.mrow`): okul no, ad; adın altında bugünün artıları için yıldız
 * çıkartmaları ve "Bugün +N"; sağda tek satır sayaç: kare **−** · net · yeşil **+**. Tek dokunuş = bir işaret.
 * Formun ilk olumlu seçeneği "+", ilk olumsuz seçeneği "−" olur (artı / eksi'de Artı ve Eksi); başka seçenekler
 * (ör. "Yarım artı") altta küçük çipler olarak kalır. Kaydedilmiş bir işaret varsa adın altındaki küçük ↶ son
 * işareti geri alır. `memo`: yalnızca sayısı değişen satır yeniden çizilir.
 */
export const MarkRow = memo(function MarkRow({ student, index, options, undoing, dayLabel = 'Bugün', showNumbers = true, onMark, onUndo }: MarkRowProps) {
  const testID = `mark-row-${index}`;
  const dayTotal = totalCount(student.dayCounts);
  const total = totalCount(student.counts);
  const net = computeNet(student.counts, options);

  const plusOption = options.find((o) => o.tone === 'positive');
  const minusOption = options.find((o) => o.tone === 'negative');
  const extras = options.filter((o) => o !== plusOption && o !== minusOption);

  const sum = (tone: FormOption['tone']) => options.filter((o) => o.tone === tone).reduce((n, o) => n + (student.dayCounts[o.key] ?? 0), 0);
  const dayPlus = sum('positive');
  const dayMinus = sum('negative');

  const netText = net !== null ? formatNet(net) : String(total);
  const netLabel =
    net !== null
      ? `${student.fullName}: net ${formatNet(net)}`
      : `${student.fullName}: toplam ${total} işaret`;
  const detail = total > 0 ? `. ${formatCounts(student.counts, options)}` : '';

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.main}>
        {showNumbers ? (
          <View style={styles.numberCol}>
            {student.number ? (
              <Text variant="number" tone="muted" align="right" numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {student.number}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.titles}>
          <Text variant="bodyStrong" numberOfLines={1} testID={`${testID}-name`}>
            {student.fullName}
          </Text>
          {dayTotal > 0 ? (
            <View style={styles.sub}>
              {dayPlus > 0 ? (
                <View style={styles.stickers} accessible={false} importantForAccessibility="no-hide-descendants">
                  {Array.from({ length: Math.min(dayPlus, MAX_STICKERS) }, (_, i) => (
                    <StarSticker key={i} size={15} />
                  ))}
                </View>
              ) : null}
              <Text variant="caption" tone="muted" testID={`${testID}-day`}>
                {dayPlus > 0 ? (
                  <Text variant="caption" color={colors.plusText} style={styles.strong}>
                    {`${dayLabel} +${dayPlus}`}
                  </Text>
                ) : null}
                {dayPlus > 0 && dayMinus > 0 ? ' ' : ''}
                {dayMinus > 0 ? `${dayPlus > 0 ? '' : `${dayLabel} `}−${dayMinus}` : ''}
                {dayPlus === 0 && dayMinus === 0 ? `${dayLabel}: ${formatCounts(student.dayCounts, options)}` : ''}
              </Text>
              {undoing ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Pressable
                  onPress={() => onUndo(student.studentId)}
                  accessibilityRole="button"
                  accessibilityLabel={`${student.fullName}: son işareti geri al`}
                  accessibilityHint={`${dayLabel} verilen son işareti siler`}
                  hitSlop={{ top: spacing.sm + spacing.xxs, bottom: spacing.sm + spacing.xxs, left: spacing.md, right: spacing.xs }}
                  style={({ pressed }) => [styles.undo, pressed && styles.undoPressed]}
                  testID={`${testID}-undo`}
                >
                  <Icon name="undo" size={iconSize.sm} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          ) : null}
        </View>
        <View style={styles.counter} accessibilityRole="toolbar" accessibilityLabel={`${student.fullName} için işaretler`}>
          {minusOption ? (
            <CounterButton
              kind="minus"
              option={minusOption}
              count={student.dayCounts[minusOption.key] ?? 0}
              studentName={student.fullName}
              dayLabel={dayLabel}
              onPress={() => onMark(student.studentId, minusOption.key)}
              testID={`${testID}-${minusOption.key}`}
            />
          ) : null}
          <View style={styles.net} accessible accessibilityLabel={`${netLabel}${detail}`}>
            <Text
              style={[styles.netText, net === 0 || (net === null && total === 0) ? styles.netZero : null]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              testID={`${testID}-net`}
            >
              {netText}
            </Text>
          </View>
          {plusOption ? (
            <CounterButton
              kind="plus"
              option={plusOption}
              count={student.dayCounts[plusOption.key] ?? 0}
              studentName={student.fullName}
              dayLabel={dayLabel}
              onPress={() => onMark(student.studentId, plusOption.key)}
              testID={`${testID}-${plusOption.key}`}
            />
          ) : null}
        </View>
      </View>
      {extras.length > 0 ? (
        <View style={[styles.extras, showNumbers && styles.extrasIndented]}>
          {extras.map((option) => (
            <ExtraChip
              key={option.key}
              option={option}
              count={student.dayCounts[option.key] ?? 0}
              studentName={student.fullName}
              dayLabel={dayLabel}
              onPress={() => onMark(student.studentId, option.key)}
              testID={`${testID}-${option.key}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
});

interface MarkTargetProps {
  option: FormOption;
  /** Seçili günde bu seçenekle verilen işaret sayısı. */
  count: number;
  studentName: string;
  dayLabel: string;
  onPress: () => void;
  testID: string;
}

/** Kare "−" (beyaz) ya da yeşil "+" düğmesi; etiketi seçeneğin adıdır ("Ayşe Yılmaz: Artı"). */
function CounterButton({ kind, option, count, studentName, dayLabel, onPress, testID }: MarkTargetProps & { kind: 'plus' | 'minus' }) {
  const plus = kind === 'plus';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${studentName}: ${option.label}`}
      accessibilityHint={count > 0 ? `${dayLabel} ${count} kez verildi` : 'Bir işaret ekler'}
      hitSlop={spacing.xs}
      style={({ pressed }) => [
        styles.counterButton,
        plus ? { backgroundColor: pressed ? tones.positive.solidPressed : tones.positive.solid } : { backgroundColor: pressed ? colors.surfaceMuted : colors.surface },
        plus && (pressed ? pressedIn('xs') : hardShadow('xs')),
      ]}
    >
      <Icon name={plus ? 'plus' : 'minus'} size={iconSize.lg} color={colors.text} />
    </Pressable>
  );
}

/** Artı/eksi dışındaki seçenekler (ör. "Yarım artı"): ton kâğıdı renginde küçük çip + bugünün sayısı. */
function ExtraChip({ option, count, studentName, dayLabel, onPress, testID }: MarkTargetProps) {
  const t = tones[option.tone];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${studentName}: ${option.label}`}
      accessibilityHint={count > 0 ? `${dayLabel} ${count} kez verildi` : 'Bir işaret ekler'}
      hitSlop={spacing.xs}
      style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? t.solid : t.soft }]}
    >
      <Text variant="label" color={colors.text} numberOfLines={1} maxFontSizeMultiplier={fontScale.dense}>
        {option.label}
      </Text>
      {count > 0 ? (
        <View style={[styles.chipCount, { backgroundColor: t.solid }]}>
          <Text variant="caption" color={t.onSolid} maxFontSizeMultiplier={1.2} style={styles.strong}>
            {String(count)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingLeft: layout.pageX,
    paddingRight: spacing.lg,
    paddingVertical: spacing.sm + spacing.xxs,
    minHeight: layout.rowHeight,
    justifyContent: 'center',
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    backgroundColor: colors.surface,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  numberCol: { width: layout.numberColumn - spacing.sm },
  titles: { flex: 1, minWidth: 0 },
  sub: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  stickers: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  strong: { fontFamily: fontFamilies.textExtraBold },
  // Görünür alan 28 pt; hitSlop ile dokunma alanı ≈ 48 × 44 (satırın kalanıyla çakışmadan).
  undo: { width: spacing.xxl + spacing.xs, height: spacing.xxl + spacing.xs, alignItems: 'center', justifyContent: 'center', borderRadius: radii.xs },
  undoPressed: { backgroundColor: colors.pressedOverlay },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  counterButton: {
    width: layout.buttonHeightSm,
    height: layout.buttonHeightSm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: strokes.base,
    borderColor: colors.outline,
  },
  net: { minWidth: layout.buttonHeightSm, alignItems: 'center', justifyContent: 'center' },
  netText: { fontFamily: fontFamilies.displayExtraBold, fontSize: 22, lineHeight: 26, color: colors.text, textAlign: 'center' },
  netZero: { color: colors.textMuted },
  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  extrasIndented: { marginLeft: layout.numberColumn - spacing.sm + spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.chipHeightCompact,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: strokes.thin,
    borderColor: colors.outline,
  },
  chipCount: {
    minWidth: spacing.xl,
    height: spacing.xl,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
