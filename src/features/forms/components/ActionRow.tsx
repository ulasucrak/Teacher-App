import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, iconSize, layout, spacing } from '@/theme';

import { FormIcon, type FormIconName } from './FormIcon';

interface ActionRowProps {
  icon: FormIconName;
  label: string;
  hint?: string;
  onPress: () => void;
  destructive?: boolean;
}

/** Sheet içindeki eylem satırı: ikon + fiil. Yıkıcı eylem kırmızı kalemle yazılır. */
export function ActionRow({ icon, label, hint, onPress, destructive = false }: ActionRowProps) {
  const color = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <FormIcon name={icon} size={iconSize.lg} color={destructive ? colors.danger : colors.primary} />
      <View style={styles.texts}>
        <Text variant="bodyStrong" color={color}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: layout.minTouch + spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  pressed: { backgroundColor: colors.pressedOverlay },
  texts: { flex: 1, gap: spacing.xxs },
});
