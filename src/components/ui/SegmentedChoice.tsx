import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fontScale, iconSize, layout, radii, spacing, tones, type ToneName } from '@/theme';

import { Icon } from './Icon';
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
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.key === value;
        const t = option.tone ? tones[option.tone] : null;
        const bg = selected ? (t ? t.solid : colors.surface) : 'transparent';
        const fg = selected && t ? t.onSolid : colors.text;
        return (
          <Pressable
            key={option.key}
            testID={testIDPrefix ? `${testIDPrefix}-${option.key}` : undefined}
            onPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onChange(option.key);
            }}
            disabled={disabled}
            hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
            accessibilityRole="radio"
            accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${option.label}` : option.label}
            accessibilityState={{ checked: selected, selected, disabled }}
            style={({ pressed }) => [
              styles.segment,
              { backgroundColor: bg },
              selected && !t && styles.raised,
              pressed && !selected && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            {selected && t ? <Icon name="check" size={iconSize.xs} color={fg} /> : null}
            <Text
              variant="label"
              color={fg}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={fontScale.dense}
              style={styles.label}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  pressed: { backgroundColor: colors.rule },
  disabled: { opacity: 0.5 },
  label: { flexShrink: 1 },
});
