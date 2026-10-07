import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radii, spacing, useReducedMotion } from '@/theme';

import { selectionA11y } from './a11y';
import { isHovered, useRovingRadio, webPressFeedback } from './SegmentedChoice.interaction';
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
  const reducedMotion = useReducedMotion();
  const selectedIndex = tabs.findIndex((t) => t.key === value);
  // Sekme listesi de ok tuşlarıyla gezilir (otomatik etkinleştirme).
  const roving = useRovingRadio(tabs.length, selectedIndex, (i) => onChange(tabs[i].key));
  return (
    <View
      style={styles.track}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      {...roving.groupProps}
    >
      {tabs.map((tab, index) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            testID={testIDPrefix ? `${testIDPrefix}-${tab.key}` : undefined}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            {...selectionA11y({ selected })}
            {...roving.itemProps(index)}
            style={(state) => [
              styles.tab,
              selected ? styles.selected : state.pressed ? styles.pressed : isHovered(state) && styles.hovered,
              webPressFeedback(state.pressed, reducedMotion),
            ]}
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
  hovered: { backgroundColor: colors.pressedOverlay },
  pressed: { backgroundColor: colors.rule },
});
