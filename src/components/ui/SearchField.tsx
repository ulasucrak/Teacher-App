import type { Ref } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fontScale, iconSize, layout, radii, spacing, typography } from '@/theme';

import { Icon } from './Icon';
import { IconButton } from './IconButton';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  /** "Ad ya da numara". */
  placeholder: string;
  /** Görünür etiket yok; ekran okuyucu adı: "Öğrenci ara". */
  accessibilityLabel: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
  /** Alana `testID`, temizle düğmesine `${testID}-clear`. */
  testID?: string;
}

/** Görünür etiketsiz arama alanı: sıra grisi hap, büyüteç, yazınca temizle düğmesi. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  autoFocus,
  onSubmitEditing,
  style,
  ref,
  testID,
}: SearchFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Icon name="search" size={iconSize.md} color={colors.textMuted} />
      <TextInput
        ref={ref}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="search"
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        maxFontSizeMultiplier={fontScale.max}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        returnKeyType="search"
        clearButtonMode="never"
        onSubmitEditing={onSubmitEditing}
        style={styles.input}
      />
      {value ? (
        <IconButton
          icon="close"
          size={iconSize.md}
          color={colors.textMuted}
          accessibilityLabel="Aramayı temizle"
          onPress={() => onChangeText('')}
          testID={testID ? `${testID}-clear` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouch,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceMuted,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xxs,
  },
  input: { ...typography.body, flex: 1, color: colors.text, paddingVertical: spacing.sm },
});
