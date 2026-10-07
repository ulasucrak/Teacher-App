import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Icon, IconButton, Text, selectionA11y } from '@/components/ui';
import { REMOVED_OPTION_KEY, computeNet, countItems, countText, formatCounts, formatNet, totalCount, type OptionCounts } from '@/features/history';
import { colors, layout, motion, radii, spacing, tones, typography, type ToneName } from '@/theme';
import type { FormOption } from '@/types/database';

import { MARK_SIZE, OPTION_FONT, SLOT_SIZE, TILE_PADDING, optionButtonWidth } from './layout';
import { ToneMark } from './ToneMark';

export interface ClassroomStudent {
  id: string;
  full_name: string;
  number: string | null;
  counts: OptionCounts;
  dayCounts: OptionCounts;
  /** Günlük formda seçili seçenek. */
  selected?: string | null;
}

/**
 * Bir öğrencinin son işaretine verilen tepki. Her işarette yeni nesne gelir (animasyon baştan
 * başlar); öğrenci başına saklanır, başka kart işaretlenince bu kartın hareketi yarıda kalmaz.
 */
export interface TilePulse {
  tone: ToneName;
  /** Olumlu işarette nette yükselen değer ("+1", "+0,5"); diğerlerinde null. */
  delta: string | null;
  /** Hareketi azalt kapalıysa true: yükselme ve yaylanma; değilse yalnız vurgu (opaklık). */
  animate: boolean;
  /** Dokunuş anı (ms). Kart sonradan yeniden çizilirse (arama, kaydırma) eski tepki oynatılmaz. */
  at: number;
}

interface ClassroomTileProps {
  student: ClassroomStudent;
  options: readonly FormOption[];
  /** Birikimli: her dokunuş bir işaret (sayılar düğmede). Günlük: tek seçim. */
  repeatable: boolean;
  width: number;
  /** "Bugün" ya da "6 Ekim 2026": seçili günün kısa adı. */
  dayLabel: string;
  disabled: boolean;
  undoing: boolean;
  pulse: TilePulse | null;
  onMark: (student: ClassroomStudent, option: FormOption) => void;
  onUndo: (studentId: string) => void;
}

const useNativeDriver = Platform.OS !== 'web';
/** Vurgunun ekranda kalma süresi: arka sıradan fark edilecek kadar, sonraki dokunuşu bekletmeyecek kadar. */
const HOLD_MS = motion.duration.slow * 3;
/** "+1" çipinin ömrü: kutlama şeridinin yarısı; okunacak kadar görünür kalır, sonra söner. */
const RISE_MS = motion.toastVisibleMs / 2;
const POP_SCALE = 1.12;

/**
 * Sınıf modunda bir öğrenci: ad (28 pt), numara ve seçili günün sayıları, net puan ve seçenek
 * düğmeleri. İşaret verilince yalnız bu kart tepki verir: kısa vurgu (opaklık), olumlu işarette
 * nette "+1" yükselir ve net sayısı yaylanır. Hareketi azalt açıksa yalnız vurgu kalır.
 */
export const ClassroomTile = memo(function ClassroomTile({
  student, options, repeatable, width, dayLabel, disabled, undoing, pulse, onMark, onUndo,
}: ClassroomTileProps) {
  const [glow] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));
  const celebrate = pulse?.tone === 'positive';
  const lift = celebrate && !!pulse?.animate && !!pulse.delta;

  useEffect(() => {
    if (!pulse || Date.now() - pulse.at > HOLD_MS) return;
    // Hızlı ardışık dokunuşlar önceki hareketi keser; son durum her zaman verinin kendisidir.
    glow.stopAnimation();
    rise.stopAnimation();
    pop.stopAnimation();
    glow.setValue(1);
    rise.setValue(0);
    pop.setValue(1);
    const parts: Animated.CompositeAnimation[] = [
      Animated.sequence([
        Animated.delay(HOLD_MS),
        Animated.timing(glow, { toValue: 0, duration: motion.duration.slow, easing: motion.easing.standard, useNativeDriver }),
      ]),
    ];
    if (pulse.tone === 'positive' && pulse.animate) {
      // Doğrusal ilerleme; yavaşlayan yükselme ve geç sönme aşağıdaki interpolasyonda.
      parts.push(Animated.timing(rise, { toValue: 1, duration: RISE_MS, easing: Easing.linear, useNativeDriver }));
      parts.push(Animated.sequence([
        Animated.timing(pop, { toValue: POP_SCALE, duration: motion.duration.fast, easing: motion.easing.standard, useNativeDriver }),
        Animated.spring(pop, { toValue: 1, friction: 4, tension: 160, useNativeDriver }),
      ]));
    }
    const animation = Animated.parallel(parts);
    animation.start();
    return () => {
      animation.stop();
      // Kesilen hareket ara değerde kalmasın (yeni dokunuş ya da kartın kaldırılması).
      glow.setValue(0);
      rise.setValue(1);
      pop.setValue(1);
    };
  }, [pulse, glow, rise, pop]);

  const net = computeNet(student.counts, options);
  const total = totalCount(student.counts);
  const dayTotal = totalCount(student.dayCounts);
  const removed = countItems(student.counts, options).find((item) => item.key === REMOVED_OPTION_KEY);
  // Seçili günün sayıları yalnız işaret varsa yazılır ("işaret yok" 40 kartta tekrar etmez).
  const dayText = repeatable && dayTotal > 0 ? `${dayLabel}: ${formatCounts(student.dayCounts, options)}` : null;
  const showMeta = repeatable || !!student.number || !!removed;
  const score = net !== null ? formatNet(net) : repeatable ? String(total) : null;
  const glowTone = pulse?.tone === 'positive' ? tones.positive : null;

  return (
    <View style={[styles.tile, { width }]} testID={`classroom-student-${student.id}`}>
      <Animated.View
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.glow,
          glowTone ? { backgroundColor: glowTone.soft, borderColor: glowTone.solid } : styles.glowNeutral,
          { opacity: glow },
        ]}
        testID={`classroom-glow-${student.id}`}
      />
      <View style={styles.top}>
        <View style={styles.identity}>
          <Text variant="bodyStrong" style={styles.name} numberOfLines={2}>{student.full_name}</Text>
          {showMeta ? (
            <View style={styles.meta}>
              {student.number ? <Text variant="number" tone="muted">{`No ${student.number}`}</Text> : null}
              {dayText ? (
                <Text variant="label" tone="muted" numberOfLines={1} style={styles.metaText} testID={`classroom-day-${student.id}`}>{dayText}</Text>
              ) : null}
              {removed ? <Text variant="label" tone="muted" numberOfLines={1} style={styles.metaText}>{countText(removed)}</Text> : null}
            </View>
          ) : null}
        </View>
        {score !== null ? (
          <Animated.View
            style={[styles.score, { transform: [{ scale: pop }] }]}
            accessible
            accessibilityLabel={net !== null ? `${student.full_name}: net ${score}` : `${student.full_name}: toplam ${score} işaret`}
          >
            <Text variant="display" align="right" testID={`classroom-net-${student.id}`} style={styles.scoreValue}>{score}</Text>
            <Text variant="label" tone="muted" align="right">{net !== null ? 'net' : 'toplam'}</Text>
            {lift ? (
              <Animated.View
                pointerEvents="none"
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.delta,
                  {
                    opacity: rise.interpolate({ inputRange: [0, 0.06, 0.75, 1], outputRange: [0, 1, 1, 0] }),
                    transform: [{ translateY: rise.interpolate({ inputRange: [0, 0.2, 1], outputRange: [spacing.sm, 0, -spacing.lg] }) }],
                  },
                ]}
                testID={`classroom-delta-${student.id}`}
              >
                <Text variant="title" color={tones.positive.onSolid}>{pulse?.delta}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
      <View
        style={styles.actions}
        accessibilityRole={repeatable ? 'toolbar' : 'radiogroup'}
        accessibilityLabel={`${student.full_name} için seçenekler`}
      >
        {options.map((option) => (
          <OptionButton
            key={option.key}
            option={option}
            repeatable={repeatable}
            count={student.counts[option.key] ?? 0}
            selected={student.selected === option.key}
            disabled={disabled}
            studentName={student.full_name}
            onPress={() => onMark(student, option)}
            testID={`classroom-${student.id}-${option.key}`}
          />
        ))}
        {repeatable ? (
          undoing ? (
            <View style={styles.undoBusy}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <IconButton
              icon="undo"
              variant="tonal"
              color={colors.text}
              accessibilityLabel={`${student.full_name}: son işareti geri al`}
              accessibilityHint={`${dayLabel} verilen son işareti siler`}
              disabled={disabled || dayTotal === 0}
              onPress={() => onUndo(student.id)}
              testID={`classroom-undo-${student.id}`}
            />
          )
        ) : null}
      </View>
    </View>
  );
});

interface OptionButtonProps {
  option: FormOption;
  repeatable: boolean;
  count: number;
  selected: boolean;
  disabled: boolean;
  studentName: string;
  onPress: () => void;
  testID: string;
}

/**
 * Seçenek düğmesi: çerçeveli, ton renginde [işaret] Etiket. Birikimlide sağda toplam sayı rozeti
 * (sayı varsa dolgulu, sıfırsa halka). Günlükte seçili düğme dolgulu ve ton işaretinin yerinde ✓:
 * seçim renkten bağımsız (dolgu + şekil) okunur, genişlik değişmez.
 */
function OptionButton({ option, repeatable, count, selected, disabled, studentName, onPress, testID }: OptionButtonProps) {
  const tone = tones[option.tone];
  const filled = !repeatable && selected;
  const fg = filled ? tone.onSolid : tone.onSoft;
  const a11y = repeatable
    ? { accessibilityRole: 'button' as const, accessibilityState: { disabled }, accessibilityHint: `Toplam ${count}. Bir işaret ekler.` }
    : { accessibilityRole: 'radio' as const, ...selectionA11y({ checked: selected, selected, disabled }) };
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`${studentName}: ${option.label}`}
      {...a11y}
      style={({ pressed }) => [
        styles.option,
        { flexBasis: optionButtonWidth(option.label, repeatable) },
        filled
          ? { backgroundColor: pressed ? tone.solidPressed : tone.solid, borderColor: pressed ? tone.solidPressed : tone.solid }
          : { backgroundColor: pressed ? tone.soft : colors.surface, borderColor: tone.solid },
        disabled && styles.disabled,
      ]}
    >
      {filled ? (
        <Icon name="check" size={MARK_SIZE} color={fg} />
      ) : (
        <ToneMark tone={option.tone} color={fg} size={MARK_SIZE} />
      )}
      <Text variant="bodyStrong" color={fg} numberOfLines={1} style={styles.optionLabel}>{option.label}</Text>
      {repeatable ? (
        <View style={[styles.slot, count > 0 ? { backgroundColor: tone.solid } : { borderColor: tone.solid, borderWidth: layout.inputBorderFocus }]}>
          <Text variant="bodyStrong" color={count > 0 ? tone.onSolid : tone.onSoft} style={styles.count} testID={`${testID}-count`}>
            {String(count)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 0,
    flexShrink: 1,
    padding: TILE_PADDING,
    gap: spacing.sm,
    borderWidth: layout.hairline,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  glow: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radii.md, borderWidth: layout.inputBorderFocus },
  glowNeutral: { borderColor: colors.text },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1, gap: spacing.xxs },
  name: { fontSize: typography.title.fontSize, lineHeight: typography.title.lineHeight },
  meta: { flexDirection: 'row', alignItems: 'center', columnGap: spacing.md, minHeight: typography.label.lineHeight },
  metaText: { flexShrink: 1 },
  score: { alignItems: 'flex-end', minWidth: layout.minTouch },
  scoreValue: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  option: {
    flexGrow: 1,
    flexShrink: 0,
    minHeight: layout.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: layout.inputBorderFocus,
  },
  disabled: { opacity: 0.5 },
  optionLabel: { fontSize: OPTION_FONT, lineHeight: typography.heading.lineHeight, flexShrink: 1 },
  slot: {
    minWidth: SLOT_SIZE,
    height: SLOT_SIZE,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontVariant: ['tabular-nums'] },
  undoBusy: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  // Netin hemen solunda: "+1" puana eklenir gibi görünür, adı kapatmaz.
  delta: {
    position: 'absolute',
    top: 0,
    right: '100%',
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: tones.positive.solid,
  },
});
