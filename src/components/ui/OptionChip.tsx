import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  colors,
  fontScale,
  layout,
  motion,
  radii,
  spacing,
  tones,
  useReducedMotion,
  type ToneName,
} from '@/theme';

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
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Form seçeneği. Seçiliyken kendi tonunun dolgusunu ve ✓ işaretini alır;
 * seçili değilken satır grisi zemin + ton noktası. Basınca seçim titreşimi.
 */
export function OptionChip({
  label,
  tone,
  selected,
  onPress,
  disabled = false,
  accessibilityLabel,
  selectionMode = 'radio',
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
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }, style]}>
      <Pressable
        testID={testID}
        onPress={handlePress}
        onPressIn={() => animateTo(motion.pressScale)}
        onPressOut={() => animateTo(1)}
        disabled={disabled}
        accessibilityRole={selectionMode}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked: selected, selected, disabled }}
        style={({ pressed }) => [
          styles.chip,
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
          <Icon name="check" size={14} color={t.onSolid} />
        ) : (
          <View style={[styles.dot, { backgroundColor: t.solid }]} />
        )}
        <Text
          variant="label"
          color={selected ? t.onSolid : colors.text}
          numberOfLines={1}
          adjustsFontSizeToFit
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

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  chip: {
    minHeight: layout.chipHeight,
    borderRadius: radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  dot: { width: 7, height: 7, borderRadius: radii.full },
  label: { flexShrink: 1 },
  disabled: { opacity: 0.5 },
});
