import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatCompactDate } from '@/features/sessions/date';
import { colors, layout, spacing } from '@/theme';

import type { FormListItem } from '../api';
import { optionCountLabel } from '../format';
import { FormIconButton } from './FormIcon';
import { ToneDots } from './ToneDots';

interface FormListRowProps {
  form: FormListItem;
  onOpen: () => void;
  onMore: () => void;
  muted?: boolean;
}

/**
 * Defter satırı gibi form satırı: ad, ders, seçeneklerin renk özeti ve son oturum.
 * Satıra dokunmak oturumları açar; "⋯" diğer eylemleri.
 */
export function FormListRow({ form, onOpen, onMore, muted = false }: FormListRowProps) {
  const last = form.lastSessionDate ? formatCompactDate(form.lastSessionDate) : null;
  const count = optionCountLabel(form.options.length);
  const lastText = last ? `Son oturum: ${last}` : 'Henüz oturum yok';
  const a11y = [form.title, form.subject, count, lastText].filter(Boolean).join(', ');

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint="Formun oturumlarını açar"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <Text variant="heading" numberOfLines={2} color={muted ? colors.textMuted : colors.text}>
          {form.title}
        </Text>
        {form.subject || form.description ? (
          <Text variant="bodySmall" tone="muted" numberOfLines={1}>
            {[form.subject, form.description].filter(Boolean).join(', ')}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <ToneDots options={form.options} />
          <Text variant="caption" tone="muted">
            {count}
          </Text>
          <Text variant="caption" tone="muted" style={styles.last} numberOfLines={1}>
            {lastText}
          </Text>
        </View>
      </Pressable>
      <FormIconButton
        icon="more"
        accessibilityLabel={`${form.title} için diğer eylemler`}
        onPress={onMore}
        color={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
  },
  main: { flex: 1, gap: spacing.xs, paddingVertical: spacing.lg, paddingRight: spacing.sm },
  pressed: { backgroundColor: colors.pressedOverlay },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xxs },
  last: { flexShrink: 1, marginLeft: 'auto' },
});
