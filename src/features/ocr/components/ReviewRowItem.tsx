import { memo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, IconButton, Text } from '@/components/ui';
import { colors, fontScale, layout, radii, spacing, tones, typography } from '@/theme';

import { issueLabels, type ReviewRow, type RowIssue } from '../review';

export interface ReviewRowItemProps {
  row: ReviewRow;
  issues: RowIssue[];
  onChange: (id: string, patch: Partial<Pick<ReviewRow, 'number' | 'fullName' | 'include'>>) => void;
  onRemove: (id: string) => void;
  autoFocus?: boolean;
}

/**
 * Defter satırı gibi düzenlenebilir inceleme satırı:
 * [işaret] okul no ┃ ad soyad [sil], altında varsa uyarılar.
 * Alanlar kutu değil, satırın üstüne yazılmış metin; odakta tükenmez mavisi alt çizgi.
 */
function ReviewRowItemBase({ row, issues, onChange, onRemove, autoFocus }: ReviewRowItemProps) {
  const [focused, setFocused] = useState<'number' | 'name' | null>(null);
  const label = row.fullName.trim() || 'Adsız satır';
  const dim = !row.include;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange(row.id, { include: !row.include })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: row.include }}
        accessibilityLabel={`${label} eklensin`}
        hitSlop={spacing.xs}
        style={styles.checkTouch}
      >
        <View style={[styles.checkbox, row.include ? styles.checkboxOn : styles.checkboxOff]}>
          {row.include ? <Icon name="check" size={16} color={colors.textInverse} /> : null}
        </View>
      </Pressable>

      <View style={styles.numberCol}>
        <TextInput
          value={row.number}
          onChangeText={(text) => onChange(row.id, { number: text.replace(/\D/g, '') })}
          placeholder="No"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={8}
          accessibilityLabel={`${label}, okul numarası`}
          maxFontSizeMultiplier={fontScale.dense}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          onFocus={() => setFocused('number')}
          onBlur={() => setFocused(null)}
          style={[
            styles.numberInput,
            dim && styles.dimText,
            focused === 'number' && styles.inputFocused,
          ]}
        />
      </View>

      <View style={styles.marginRule} />

      <View style={styles.main}>
        <View style={styles.nameLine}>
          <TextInput
            value={row.fullName}
            onChangeText={(text) => onChange(row.id, { fullName: text })}
            placeholder="Ad soyad"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus={autoFocus}
            accessibilityLabel={row.fullName.trim() ? `${row.fullName}, ad soyad` : 'Ad soyad'}
            maxFontSizeMultiplier={fontScale.max}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            onFocus={() => setFocused('name')}
            onBlur={() => setFocused(null)}
            style={[styles.nameInput, dim && styles.dimText, focused === 'name' && styles.inputFocused]}
          />
          <IconButton
            icon="trash"
            size={20}
            color={colors.textMuted}
            accessibilityLabel={`${label} satırını sil`}
            onPress={() => onRemove(row.id)}
          />
        </View>
        {issues.length > 0 ? (
          <View style={styles.issues} accessibilityLiveRegion="polite">
            {issues.map((issue) => (
              <View key={issue} style={styles.issue}>
                <Icon name="warning" size={14} color={tones.warning.onSoft} />
                <Text variant="caption" color={tones.warning.onSoft} style={styles.issueText}>
                  {issueLabels[issue]}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const ReviewRowItem = memo(ReviewRowItemBase);

const CHECKBOX = 24;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    paddingVertical: spacing.xs,
  },
  checkTouch: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: CHECKBOX,
    height: CHECKBOX,
    borderRadius: radii.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary },
  checkboxOff: { borderWidth: layout.inputBorder, borderColor: colors.border, backgroundColor: colors.surface },
  numberCol: { width: layout.numberColumn + spacing.xl, paddingRight: spacing.sm },
  numberInput: {
    ...typography.number,
    color: colors.text,
    textAlign: 'right',
    minHeight: layout.minTouch,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.inputBorderFocus,
    borderBottomColor: 'transparent',
  },
  marginRule: { width: layout.marginRuleWidth, alignSelf: 'stretch', backgroundColor: colors.marginRule },
  main: { flex: 1, paddingLeft: spacing.md, paddingRight: spacing.xs },
  nameLine: { flexDirection: 'row', alignItems: 'center' },
  nameInput: {
    ...typography.bodyStrong,
    flex: 1,
    color: colors.text,
    minHeight: layout.minTouch,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.inputBorderFocus,
    borderBottomColor: 'transparent',
  },
  inputFocused: { borderBottomColor: colors.primary },
  dimText: { color: colors.textMuted, textDecorationLine: 'line-through' },
  issues: { gap: spacing.xxs, paddingBottom: spacing.sm },
  issue: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  issueText: { flexShrink: 1 },
});
