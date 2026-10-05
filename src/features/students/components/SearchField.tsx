import { StyleSheet, TextInput, View } from 'react-native';

import { Icon, IconButton } from '@/components/ui';
import { colors, fontScale, layout, radii, spacing, typography } from '@/theme';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  accessibilityLabel: string;
}

/** Görünür etiketsiz arama alanı (satır grisi zemin, büyüteç ikonu, temizle düğmesi). */
export function SearchField({ value, onChangeText, placeholder, accessibilityLabel }: SearchFieldProps) {
  return (
    <View style={styles.wrap}>
      <Icon name="search" size={18} color={colors.textMuted} />
      <TextInput
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
        returnKeyType="search"
        clearButtonMode="never"
        style={styles.input}
      />
      {value ? (
        <IconButton
          icon="close"
          size={18}
          color={colors.textMuted}
          accessibilityLabel="Aramayı temizle"
          onPress={() => onChangeText('')}
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
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    paddingLeft: spacing.md,
    paddingRight: spacing.xxs,
  },
  input: { ...typography.body, flex: 1, color: colors.text, paddingVertical: spacing.sm },
});
