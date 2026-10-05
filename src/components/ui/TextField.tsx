import { useState, type Ref } from 'react';
import {
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

  const borderColor = hasError ? colors.danger : focused ? colors.primary : colors.border;

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
          style={styles.input}
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

const styles = StyleSheet.create({
  container: { gap: spacing.xs + spacing.xxs },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.buttonHeight,
    borderRadius: radii.sm,
    borderWidth: layout.inputBorder,
    backgroundColor: colors.surface,
    paddingLeft: spacing.md + spacing.xxs,
    paddingRight: spacing.xxs,
  },
  inputWrapEmphasis: { borderWidth: layout.inputBorderFocus },
  inputDisabled: { backgroundColor: colors.surfaceMuted },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  messageText: { flex: 1 },
});
