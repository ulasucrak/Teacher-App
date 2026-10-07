import { useState } from 'react';
import { PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { selectionHaptic } from '@/lib/haptics';
import { colors, fontScale, iconSize, layout, radii, spacing, tones, type ToneName } from '@/theme';

import { selectionA11y } from './a11y';
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

/** Etiket başına ortalama genişlik (label, Atkinson 600 15 px ≈ 8,3 pt) — sığma kararı için payla. */
const CHAR_WIDTH = 8.6;

/**
 * 2–4 seçenekli tek seçim (radiogroup). Yeterli genişlik varsa (masaüstü, geniş telefon)
 * segmentler eşit sütunlardır ve alt alta hizalanır. Dar ekranda (ya da büyük yazıda) segmentler
 * içeriğe göre genişler, boş yeri paylaşır; tek satıra sığmıyorsa kesilip "Gelm…" olmak yerine
 * ikinci satıra sarar, etiket de gerekirse iki satıra bölünür. Örn. sihirbazda "Fotoğraf / Liste / Elle".
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
  // 4 seçenekte yan boşluk daralır: telefonda (öğrenci satırında ~290 pt) tek satıra sığsın.
  const dense = options.length >= 4;
  const [width, setWidth] = useState(0);
  // Eşit sütunlar yalnızca en uzun etiket (✓ ile birlikte) rahat sığıyorsa; ölçü gelene kadar içerik genişliği.
  const longest = Math.max(...options.map((o) => o.label.length));
  const textScale = Math.min(PixelRatio.getFontScale(), fontScale.dense);
  const gap = dense ? spacing.xxs : spacing.xs;
  const each = (width - spacing.xs * 2 - gap * (options.length - 1)) / options.length;
  const need = longest * CHAR_WIDTH * textScale + (dense ? spacing.xs : spacing.sm) * 2 + iconSize.xs + spacing.xs;
  const equal = width > 0 && each >= need;
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, dense && styles.trackDense, equal && styles.trackEqual]}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
    >
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
              selectionHaptic();
              onChange(option.key);
            }}
            disabled={disabled}
            hitSlop={{ top: spacing.xs, bottom: spacing.xs }}
            accessibilityRole="radio"
            accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}: ${option.label}` : option.label}
            {...selectionA11y({ checked: selected, selected, disabled })}
            style={({ pressed }) => [
              styles.segment,
              dense && styles.segmentDense,
              equal && styles.segmentEqual,
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
              align="center"
              numberOfLines={2}
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
    flexWrap: 'wrap',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    // İçerik genişliğinde başlar (flexBasis auto), satırdaki boş yeri eşit paylaşır, sığmazsa alta sarar.
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    // Dokunma alanı ≥ 44 pt (+ hitSlop ile ızın içindeki 4 pt boşluk da sayılır).
    minHeight: layout.chipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm - spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  trackDense: { gap: spacing.xxs },
  trackEqual: { flexWrap: 'nowrap' },
  segmentEqual: { flexGrow: 1, flexBasis: 0 },
  segmentDense: { paddingHorizontal: spacing.xs },
  raised: { borderWidth: layout.hairline, borderColor: colors.rule },
  pressed: { backgroundColor: colors.rule },
  disabled: { opacity: 0.5 },
  label: { flexShrink: 1 },
});
