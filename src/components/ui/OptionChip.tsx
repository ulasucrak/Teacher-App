import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontScale, iconSize, layout, motion, radii, spacing, tones, type ToneName, useReducedMotion } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export interface OptionChipProps {
  label: string;
  tone: ToneName;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** Ekran okuyucu için bağlam: "Ayşe Yılmaz: Tamamlandı". Varsayılan: label. */
  accessibilityLabel?: string;
  /** `radio`: tek seçim (varsayılan), `checkbox`: çoklu seçim. */
  selectionMode?: 'radio' | 'checkbox';
  /** Kompakt (40 pt + hitSlop) — doldurma ekranında satır içi çipler. */
  compact?: boolean;
  /** Satırdaki boşluğu eşit paylaş (ızgara, varsayılan true) ya da içerik genişliğinde kal (false). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Form seçeneği. Seçiliyken kendi tonunun dolgusunu ve ✓ işaretini alır;
 * seçili değilken sıra grisi zemin + ton noktası. Basınca seçim titreşimi.
 */
export function OptionChip({
  label,
  tone,
  selected,
  onPress,
  disabled = false,
  accessibilityLabel,
  selectionMode = 'radio',
  compact = false,
  fill = true,
  style,
  testID,
}: OptionChipProps) {
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const t = tones[tone];

  const animateTo = (value: number) => {
    if (reducedMotion) return;
    Animated.timing(scale, {
      toValue: value,
      duration: motion.duration.fast,
      easing: motion.easing.standard,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => undefined);
    onPress();
  };

  return (
    <Animated.View style={[fill && styles.fill, { transform: [{ scale }] }, style]}>
      <Pressable
        testID={testID}
        onPress={handlePress}
        onPressIn={() => animateTo(motion.pressScale)}
        onPressOut={() => animateTo(1)}
        disabled={disabled}
        hitSlop={compact ? spacing.xs : 0}
        accessibilityRole={selectionMode}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked: selected, selected, disabled }}
        style={({ pressed }) => [
          styles.chip,
          compact ? styles.compact : styles.regular,
          {
            backgroundColor: selected
              ? pressed
                ? t.solidPressed
                : t.solid
              : pressed
                ? colors.rule
                : colors.surfaceMuted,
          },
          disabled && styles.disabled,
        ]}
      >
        {selected ? (
          <Icon name="check" size={iconSize.xs} color={t.onSolid} />
        ) : (
          <View style={[styles.dot, { backgroundColor: t.solid }]} />
        )}
        <Text
          variant="label"
          color={selected ? t.onSolid : colors.text}
          numberOfLines={1}
          adjustsFontSizeToFit={fill}
          minimumFontScale={0.8}
          maxFontSizeMultiplier={fontScale.dense}
          style={styles.label}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const DOT = spacing.sm - 1;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  chip: {
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + spacing.xxs,
  },
  regular: { minHeight: layout.chipHeight, paddingHorizontal: spacing.sm },
  compact: { minHeight: layout.chipHeightCompact, paddingHorizontal: spacing.md },
  dot: { width: DOT, height: DOT, borderRadius: radii.full },
  label: { flexShrink: 1 },
  disabled: { opacity: 0.5 },
});
