import { memo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { colors, fontScale, iconSize, layout, spacing, tones, typography } from '@/theme';

import { issueLabels, type ReviewRow, type RowIssue } from '../review';

export interface ReviewListProps {
  rows: readonly ReviewRow[];
  issues: Map<string, RowIssue[]>;
  onChange: (id: string, patch: Partial<Pick<ReviewRow, 'number' | 'fullName'>>) => void;
  onRemove: (id: string) => void;
  /** Satırlara `${testIDPrefix}-${index}` (varsayılan "student-row"). */
  testIDPrefix?: string;
}

/**
 * Eklenecek öğrencilerin kompakt, düzenlenebilir listesi: numara + ad (yerinde düzenlenir) + kaldır.
 * Uyarı (tekrar, kısa ad…) adın altında tek satır soluk metin.
 */
export function ReviewList({ rows, issues, onChange, onRemove, testIDPrefix = 'student-row' }: ReviewListProps) {
  return (
    <View accessibilityRole="list">
      {rows.map((row, index) => (
        <ReviewListRow
          key={row.id}
          row={row}
          issue={issues.get(row.id)?.[0] ?? null}
          onChange={onChange}
          onRemove={onRemove}
          testID={`${testIDPrefix}-${index}`}
        />
      ))}
    </View>
  );
}

interface RowProps {
  row: ReviewRow;
  issue: RowIssue | null;
  onChange: ReviewListProps['onChange'];
  onRemove: ReviewListProps['onRemove'];
  testID: string;
}

const ReviewListRow = memo(function ReviewListRow({ row, issue, onChange, onRemove, testID }: RowProps) {
  const [focused, setFocused] = useState<'number' | 'name' | null>(null);
  const label = row.fullName.trim() || 'Adsız satır';

  return (
    <View style={styles.row} testID={testID}>
      <TextInput
        testID={`${testID}-number`}
        value={row.number}
        onChangeText={(text) => onChange(row.id, { number: text.replace(/[^\p{L}\p{N}]/gu, '') })}
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
        style={[styles.number, focused === 'number' && styles.focused]}
      />
      <View style={styles.main}>
        <TextInput
          testID={`${testID}-name`}
          value={row.fullName}
          onChangeText={(text) => onChange(row.id, { fullName: text })}
          placeholder="Ad soyad"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          accessibilityLabel={row.fullName.trim() ? `${row.fullName}, ad soyad` : 'Ad soyad'}
          maxFontSizeMultiplier={fontScale.max}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
          style={[styles.name, focused === 'name' && styles.focused]}
        />
        {issue ? (
          <Text
            variant="caption"
            color={tones.warning.onSoft}
            numberOfLines={1}
            accessibilityLiveRegion="polite"
            testID={`${testID}-issue`}
          >
            {issueLabels[issue]}
          </Text>
        ) : null}
      </View>
      <IconButton
        icon="close"
        size={iconSize.md}
        color={colors.textMuted}
        accessibilityLabel={`${label} listeden çıkarılsın`}
        onPress={() => onRemove(row.id)}
        testID={`${testID}-remove`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderBottomWidth: layout.hairline,
    borderBottomColor: colors.rule,
    paddingVertical: spacing.xxs,
  },
  number: {
    ...typography.number,
    width: layout.numberColumn + spacing.lg,
    color: colors.textMuted,
    textAlign: 'right',
    minHeight: layout.minTouch,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.inputBorderFocus,
    borderBottomColor: 'transparent',
  },
  main: { flex: 1, paddingBottom: spacing.xs },
  name: {
    ...typography.bodyStrong,
    color: colors.text,
    minHeight: layout.minTouch,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.inputBorderFocus,
    borderBottomColor: 'transparent',
  },
  focused: { borderBottomColor: colors.primary },
});
