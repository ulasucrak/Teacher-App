import { useState, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, fontScale, iconSize, layout, radii, spacing, typography } from '@/theme';

import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Hata metni: ne oldu + nasıl düzelir. Varsa alan kırmızı çerçevelenir. */
  error?: string | null;
  hint?: string;
  /** Şifre alanı: göster/gizle düğmesi eklenir. */
  password?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
}

/**
 * Etiketli metin alanı: sıra grisi dolgu, odakta beyaz + mavi kenar, hatada kırmızı kenar.
 * `multiline` verilirse (ör. "Listeyi yapıştırın") en az 3 satır yükseklik alır.
 */
export function TextField({
  label,
  error,
  hint,
  password = false,
  containerStyle,
  ref,
  onFocus,
  onBlur,
  editable = true,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hasError = Boolean(error);

  const borderColor = hasError ? colors.danger : focused ? colors.primary : 'transparent';
  const multiline = Boolean(inputProps.multiline);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text variant="label" nativeID={`${label}-label`}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          { borderColor },
          (focused || hasError) && styles.inputWrapEmphasis,
          focused && styles.inputFocused,
          multiline && styles.inputWrapMultiline,
          !editable && styles.inputDisabled,
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={hint}
          accessibilityState={{ disabled: !editable }}
          aria-invalid={hasError}
          editable={editable}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxFontSizeMultiplier={fontScale.max}
          secureTextEntry={password && !revealed}
          autoCorrect={password ? false : inputProps.autoCorrect}
          textAlignVertical={multiline ? 'top' : undefined}
          style={[styles.input, multiline && styles.inputMultiline]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {password ? (
          <IconButton
            icon={revealed ? 'eyeOff' : 'eye'}
            accessibilityLabel={revealed ? 'Şifreyi gizle' : 'Şifreyi göster'}
            onPress={() => setRevealed((v) => !v)}
            color={colors.textMuted}
            size={iconSize.lg}
          />
        ) : null}
      </View>
      {hasError ? (
        <View style={styles.message} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Icon name="error" size={iconSize.sm} color={colors.danger} />
          <Text variant="caption" tone="danger" style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Web: odak zaten kapsayıcının 2 px mavi kenarıyla gösterilir; tarayıcının iç çerçevesi çift çizgi yapar. */
const noBrowserOutline = (Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as object;

const styles = StyleSheet.create({
  container: { gap: spacing.xs + spacing.xxs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.buttonHeight,
    borderRadius: radii.sm,
    borderWidth: layout.inputBorderFocus,
    backgroundColor: colors.surfaceMuted,
    paddingLeft: spacing.lg - layout.inputBorderFocus,
    paddingRight: spacing.xxs,
  },
  inputWrapEmphasis: { borderWidth: layout.inputBorderFocus },
  inputFocused: { backgroundColor: colors.surface },
  inputWrapMultiline: { alignItems: 'stretch', minHeight: layout.buttonHeight * 3 },
  inputDisabled: { opacity: 0.6 },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
    ...noBrowserOutline,
  },
  inputMultiline: { paddingTop: spacing.md, paddingRight: spacing.md },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  messageText: { flex: 1 },
});
