import { useState, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

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
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, focused && styles.wrapFocused, style]}>
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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

/** Web: odak kapsayıcının kenarıyla gösterilir; tarayıcının iç çerçevesi kaldırılır. */
const noBrowserOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouch,
    borderRadius: radii.full,
    // Odak: TextField ile aynı dil (beyaz zemin + 2 px mavi kenar); kenar hep ayrılı, odakta yer değişmez.
    borderWidth: layout.inputBorderFocus,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
    paddingLeft: spacing.lg - layout.inputBorderFocus,
    paddingRight: spacing.xxs,
  },
  wrapFocused: { backgroundColor: colors.surface, borderColor: colors.primary },
  input: { ...typography.body, flex: 1, color: colors.text, paddingVertical: spacing.sm, ...noBrowserOutline },
});
