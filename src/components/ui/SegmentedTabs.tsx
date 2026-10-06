import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { selectionA11y } from './a11y';
import { Text } from './Text';

export interface SegmentedTab<K extends string = string> {
  key: K;
  label: string;
}

export interface SegmentedTabsProps<K extends string> {
  tabs: readonly SegmentedTab<K>[];
  value: K;
  onChange: (key: K) => void;
  accessibilityLabel?: string;
  /** Her sekmeye `${testIDPrefix}-${key}` verilir. */
  testIDPrefix?: string;
}

/** 2–4 görünüm arasında geçiş (değer seçimi için `SegmentedChoice`). */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  accessibilityLabel,
  testIDPrefix,
}: SegmentedTabsProps<K>) {
  return (
    <View style={styles.track} accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            testID={testIDPrefix ? `${testIDPrefix}-${tab.key}` : undefined}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            {...selectionA11y({ selected })}
            style={({ pressed }) => [styles.tab, selected ? styles.selected : pressed && styles.pressed]}
          >
            <Text variant="label" tone={selected ? 'default' : 'muted'} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: layout.chipHeight - spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm - spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  selected: {
    backgroundColor: colors.surface,
    borderWidth: layout.hairline,
    borderColor: colors.rule,
  },
  pressed: { backgroundColor: colors.rule },
});
