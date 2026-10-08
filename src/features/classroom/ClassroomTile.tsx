import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon, IconButton, PaperCard, Stamp, StarSticker, Text, selectionA11y } from '@/components/ui';
import { REMOVED_OPTION_KEY, computeNet, countItems, countText, formatCounts, formatNet, totalCount, type OptionCounts } from '@/features/history';
import { colors, hardShadow, layout, motion, pressedIn, radii, spacing, tones, type ToneName } from '@/theme';
import type { FormOption } from '@/types/database';

import { MARK_SIZE, OPTION_FONT, TILE_PADDING, hasQuickOptions, quickOption, type QuickOption } from './layout';
import { ToneMark } from './ToneMark';

export interface ClassroomStudent {
  id: string;
  full_name: string;
  number: string | null;
  counts: OptionCounts;
  dayCounts: OptionCounts;
  selected?: string | null;
}

export interface TilePulse {
  tone: ToneName;
  delta: string | null;
  animate: boolean;
  /** Unique gesture sequence, even when two taps share the same millisecond. */
  key: number;
  at: number;
}

interface ClassroomTileProps {
  student: ClassroomStudent;
  options: readonly FormOption[];
  repeatable: boolean;
  width: number;
  tapeIndex: number;
  dayLabel: string;
  disabled: boolean;
  undoing: boolean;
  pulse: TilePulse | null;
  onMark: (student: ClassroomStudent, option: FormOption) => void;
  onUndo: (studentId: string) => void;
}

const useNativeDriver = Platform.OS !== 'web';
const HOLD_MS = motion.duration.slow * 3;

/** A taped paper card: identity, net, stickers and one clear row of score controls. */
export const ClassroomTile = memo(function ClassroomTile({
  student, options, repeatable, width, tapeIndex, dayLabel, disabled, undoing, pulse, onMark, onUndo,
}: ClassroomTileProps) {
  const [expiredKey, setExpiredKey] = useState<number | null>(null);
  const [mountedAt] = useState(() => Date.now());
  const activePulse = pulse?.tone === 'positive' && pulse.key !== expiredKey && pulse.at + HOLD_MS > mountedAt ? pulse : null;
  const animateStamp = !!activePulse?.animate && activePulse.at >= mountedAt - 100;
  const [thud] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));
  const [sticker] = useState(() => new Animated.Value(1));

  useEffect(() => {
    thud.setValue(0);
    pop.setValue(1);
    sticker.setValue(1);
    if (!pulse || pulse.tone !== 'positive' || Date.now() - pulse.at >= HOLD_MS) return;
    const timer = setTimeout(() => setExpiredKey(pulse.key), Math.max(0, HOLD_MS - (Date.now() - pulse.at)));
    let animation: Animated.CompositeAnimation | undefined;
    if (pulse.animate && pulse.at >= mountedAt - 100) {
      sticker.setValue(0);
      animation = Animated.parallel([
        Animated.sequence([
          Animated.delay(150),
          Animated.timing(thud, { toValue: 3, duration: 100, useNativeDriver }),
          Animated.timing(thud, { toValue: 0, duration: 150, useNativeDriver }),
        ]),
        Animated.sequence([
          Animated.delay(260),
          Animated.timing(pop, { toValue: 1.12, duration: motion.duration.fast, useNativeDriver }),
          Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver }),
        ]),
        Animated.sequence([
          Animated.delay(420),
          Animated.spring(sticker, { toValue: 1, friction: 5, tension: 160, useNativeDriver }),
        ]),
      ]);
      animation.start();
    }
    return () => { clearTimeout(timer); animation?.stop(); };
  }, [pulse, thud, pop, sticker, mountedAt]);

  const net = computeNet(student.counts, options);
  const total = totalCount(student.counts);
  const dayTotal = totalCount(student.dayCounts);
  const removed = countItems(student.counts, options).find((item) => item.key === REMOVED_OPTION_KEY);
  const score = net !== null ? formatNet(net) : repeatable ? String(total) : null;
  const quick = hasQuickOptions(options);
  const ordered = quick ? [...options].sort((a, b) => {
    const order = { minus: 0, half: 1, plus: 2 };
    return order[quickOption(a)!] - order[quickOption(b)!];
  }) : options;
  const positiveCount = options.reduce((sum, option) => sum + (option.tone === 'positive' ? student.counts[option.key] ?? 0 : 0), 0);
  const stars = Math.min(positiveCount, 5);
  const words = student.full_name.trim().split(/\s+/);
  const surname = words.length > 1 ? words.pop() : null;
  const dayText = repeatable && dayTotal > 0 ? `${dayLabel}: ${formatCounts(student.dayCounts, options)}` : null;

  return (
    <Animated.View style={{ width, transform: [{ translateX: thud }, { translateY: thud }] }}>
      <PaperCard
        onBoard
        tapeIndex={tapeIndex}
        style={[styles.tile, activePulse && styles.celebrating, activePulse && hardShadow('xs', colors.boardDeep)]}
        testID={`classroom-student-${student.id}`}
      >
        <View style={styles.top}>
          <View style={styles.identity}>
            <Text variant="heading" style={styles.name}>{words.join(' ')}</Text>
            {surname ? <Text variant="label" tone="muted">{surname}</Text> : null}
          </View>
          {score !== null ? (
            <Animated.View
              style={[styles.score, (net ?? total) > 0 ? styles.scorePositive : styles.scoreZero, { transform: [{ scale: pop }] }]}
              accessible
              accessibilityLabel={net !== null ? `${student.full_name}: net ${score}` : `${student.full_name}: toplam ${score} işaret`}
            >
              <Text
                variant="heading"
                color={(net ?? total) > 0 ? colors.textInverse : colors.text}
                maxFontSizeMultiplier={1.2}
                style={[styles.scoreValue, score.length > 4 && styles.scoreLong]}
                testID={`classroom-net-${student.id}`}
              >{score}</Text>
            </Animated.View>
          ) : null}
        </View>
        <View style={styles.stickers} testID={`classroom-stars-${student.id}`}>
          {Array.from({ length: stars }, (_, index) => (
            <Animated.View key={index} style={activePulse && index === stars - 1 ? { transform: [{ scale: sticker }] } : undefined}>
              <StarSticker size={19} rotate={index % 2 ? 8 : -8} />
            </Animated.View>
          ))}
          {score !== null ? <Text variant="caption" tone="muted" style={styles.netLabel}>{net !== null ? 'net' : 'toplam'}</Text> : null}
        </View>
        <View style={styles.actions} accessibilityRole={repeatable ? 'toolbar' : 'radiogroup'} accessibilityLabel={`${student.full_name} için seçenekler`}>
          {ordered.map((option) => (
            <OptionButton
              key={option.key}
              option={option}
              kind={quick ? quickOption(option) : null}
              repeatable={repeatable}
              count={student.counts[option.key] ?? 0}
              selected={student.selected === option.key}
              disabled={disabled}
              studentName={student.full_name}
              onPress={() => onMark(student, option)}
              testID={`classroom-${student.id}-${option.key}`}
            />
          ))}
        </View>
        {repeatable && quick ? (
          <View style={styles.counts} testID={`classroom-counts-${student.id}`}>
            {options.map((option) => (
              <Text key={option.key} variant="caption" testID={`classroom-${student.id}-${option.key}-count`}>
                {`${student.counts[option.key] ?? 0} ${option.label}`}
              </Text>
            ))}
          </View>
        ) : null}
        {removed ? <Text variant="caption" tone="muted">{countText(removed)}</Text> : null}
        <View style={styles.meta}>
          <View style={styles.metaText}>
            {student.number ? <Text variant="caption" tone="muted">{`No ${student.number}`}</Text> : null}
            {dayText ? <Text variant="caption" tone="muted" testID={`classroom-day-${student.id}`}>{dayText}</Text> : null}
          </View>
          {repeatable ? undoing ? (
            <View style={styles.undoBusy} accessibilityLabel={`${student.full_name}: geri alınıyor`}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <IconButton
              icon="undo"
              color={colors.textMuted}
              accessibilityLabel={`${student.full_name}: son işareti geri al`}
              accessibilityHint={`${dayLabel} verilen son işareti siler`}
              disabled={disabled || dayTotal === 0}
              onPress={() => onUndo(student.id)}
              testID={`classroom-undo-${student.id}`}
            />
          ) : null}
        </View>
        {activePulse ? (
          <Stamp key={activePulse.key} value={activePulse.delta ?? '+1'} animate={animateStamp} style={styles.stamp} testID={`classroom-stamp-${student.id}`} />
        ) : null}
      </PaperCard>
    </Animated.View>
  );
});

interface OptionButtonProps {
  option: FormOption;
  kind: QuickOption | null;
  repeatable: boolean;
  count: number;
  selected: boolean;
  disabled: boolean;
  studentName: string;
  onPress: () => void;
  testID: string;
}

function OptionButton({ option, kind, repeatable, count, selected, disabled, studentName, onPress, testID }: OptionButtonProps) {
  const tone = tones[option.tone];
  const filled = !repeatable && selected;
  const square = kind === 'minus' || kind === 'half';
  const a11y = repeatable
    ? { accessibilityRole: 'button' as const, accessibilityState: { disabled }, accessibilityHint: `Toplam ${count}. Bir işaret ekler.` }
    : { accessibilityRole: 'radio' as const, ...selectionA11y({ checked: selected, selected, disabled }), accessibilityHint: selected ? 'Tekrar dokununca seçimi kaldırır' : 'Bu öğrencinin günlük değerini seçer' };
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`${studentName}: ${option.label}`}
      {...a11y}
      style={({ pressed }) => [
        styles.option,
        kind ? square ? styles.squareOption : styles.plusOption : styles.genericOption,
        { backgroundColor: filled ? tone.solid : colors.surface },
        pressed ? pressedIn('xs') : hardShadow('xs'),
        disabled && styles.disabled,
      ]}
    >
      {kind === 'half' ? <Text variant="bodyStrong" style={styles.half}>½</Text> : (
        <View style={kind === 'plus' ? styles.plusCircle : undefined}>
          <ToneMark tone={option.tone} color={colors.text} size={kind === 'plus' ? 16 : MARK_SIZE} />
        </View>
      )}
      {!square ? <Text variant="bodyStrong" style={styles.optionLabel}>{option.label}</Text> : null}
      {filled ? <Icon name="check" size={16} color={colors.text} /> : null}
      {repeatable && !kind ? <Text variant="label" testID={`${testID}-count`}>{String(count)}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: TILE_PADDING, gap: spacing.xs, minHeight: 166, overflow: 'visible' },
  celebrating: { backgroundColor: tones.positive.soft },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  identity: { flex: 1 },
  name: { fontSize: 26, lineHeight: 28, letterSpacing: -0.5 },
  score: { minWidth: 50, minHeight: 50, paddingHorizontal: spacing.xs, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', borderWidth: layout.stroke, borderColor: colors.outline },
  scorePositive: { backgroundColor: colors.outline },
  scoreZero: { backgroundColor: colors.surface },
  scoreValue: { fontSize: 21, lineHeight: 26, fontVariant: ['tabular-nums'] },
  scoreLong: { fontSize: 17, lineHeight: 22 },
  stickers: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, minHeight: 24 },
  netLabel: { marginLeft: 'auto' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: spacing.sm, marginTop: 'auto', paddingVertical: spacing.xs },
  option: { minHeight: layout.minTouch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs, borderRadius: radii.sm, borderWidth: layout.stroke, borderColor: colors.outline },
  squareOption: { width: layout.minTouch, flexShrink: 0 },
  plusOption: { flex: 1 },
  genericOption: { flexBasis: '47%', flexGrow: 1, flexShrink: 1 },
  optionLabel: { fontSize: OPTION_FONT, lineHeight: 22, flexShrink: 1 },
  plusCircle: { width: 26, height: 26, borderRadius: radii.full, borderWidth: 2, borderColor: colors.outline, backgroundColor: colors.plus, alignItems: 'center', justifyContent: 'center' },
  half: { fontSize: 24, lineHeight: 28 },
  disabled: { opacity: 0.5 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.sm, rowGap: spacing.xxs },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaText: { flex: 1 },
  undoBusy: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  stamp: { position: 'absolute', right: 4, bottom: 2, zIndex: 3 },
});
