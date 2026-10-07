import { Pressable, StyleSheet, View } from 'react-native';

import { selectionHaptic } from '@/lib/haptics';
import { colors, fontScale, iconSize, layout, radii, spacing, tones, type ToneName, useReducedMotion } from '@/theme';

import { selectionA11y } from './a11y';
import { useFitText } from './fitText';
import { Icon } from './Icon';
import { isHovered, useRovingRadio, webPressFeedback, type RovingItemProps } from './SegmentedChoice.interaction';
import { Text } from './Text';

export interface SegmentedChoiceItem<K extends string = string> {
  key: K;
  label: string;
  /** Seçiliyken dolgu tonu; verilmezse beyaz "kaldırılmış" segment. */
  tone?: ToneName;
}

export interface SegmentedChoiceProps<K extends string> {
  options: readonly SegmentedChoiceItem<K>[];
  value: K | null | undefined;
  onChange: (key: K) => void;
  disabled?: boolean;
  /** Ekran okuyucu bağlamı: grup adı ya da öğrenci adı. */
  accessibilityLabel?: string;
  /** Her segmente `${testIDPrefix}-${key}` verilir. */
  testIDPrefix?: string;
}

/**
 * 2–4 seçenekli tek seçim (radiogroup): tek satır, eşit genişlik. Örn. yoklamada
 * "Geldi / Gelmedi / İzinli", sihirbazda "Fotoğraf / Liste / Elle".
 * Görünüm değiştirmek için değil — onun için `SegmentedTabs`.
 */
export function SegmentedChoice<K extends string>({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel,
  testIDPrefix,
}: SegmentedChoiceProps<K>) {
  const selectedIndex = options.findIndex((o) => o.key === value);
  const select = (key: K) => {
    selectionHaptic();
    onChange(key);
  };
  const roving = useRovingRadio(options.length, selectedIndex, (i) => select(options[i].key), disabled);

  return (
    <View
      style={styles.track}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      {...roving.groupProps}
    >
      {options.map((option, index) => (
        <Segment
          key={option.key}
          option={option}
          selected={option.key === value}
          disabled={disabled}
          onPress={() => select(option.key)}
          groupLabel={accessibilityLabel}
          testID={testIDPrefix ? `${testIDPrefix}-${option.key}` : undefined}
          webProps={roving.itemProps(index)}
        />
      ))}
    </View>
  );
}

interface SegmentProps {
  option: SegmentedChoiceItem;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  groupLabel?: string;
  testID?: string;
  webProps: RovingItemProps;
}

function Segment({ option, selected, disabled, onPress, groupLabel, testID, webProps }: SegmentProps) {
  const reducedMotion = useReducedMotion();
  const fit = useFitText(option.label, { minimumFontScale: 0.8 });
  const t = option.tone ? tones[option.tone] : null;
  const bg = selected ? (t ? t.solid : colors.surface) : 'transparent';
  const fg = selected && t ? t.onSolid : colors.text;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
      accessibilityRole="radio"
      accessibilityLabel={groupLabel ? `${groupLabel}: ${option.label}` : option.label}
      {...selectionA11y({ checked: selected, selected, disabled })}
      {...webProps}
      style={(state) => [
        styles.segment,
        { backgroundColor: bg },
        selected && !t && styles.raised,
        !selected && !disabled && isHovered(state) && styles.hovered,
        state.pressed && !selected && styles.pressed,
        disabled && styles.disabled,
        !disabled && webPressFeedback(state.pressed, reducedMotion),
      ]}
    >
      {selected && t ? <Icon name="check" size={iconSize.xs} color={fg} /> : null}
      <Text
        variant="label"
        color={fg}
        numberOfLines={1}
        {...fit.textProps}
        maxFontSizeMultiplier={fontScale.dense}
        style={[styles.label, fit.style]}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    // Dokunma alanı ≥ 44 pt (+ hitSlop ile ızın içindeki 4 pt boşluk da sayılır).
    minHeight: layout.chipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm - spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  raised: { borderWidth: layout.hairline, borderColor: colors.rule },
  hovered: { backgroundColor: colors.pressedOverlay },
  pressed: { backgroundColor: colors.rule },
  disabled: { opacity: 0.5 },
  label: { flexShrink: 1 },
});
