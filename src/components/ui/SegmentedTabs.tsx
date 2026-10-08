import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radii, strokes, useReducedMotion } from '@/theme';

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

/**
 * 2–4 görünüm arasında geçiş (değer seçimi için `SegmentedChoice`). Kalın kurşun çerçeveli şerit;
 * seçili sekme kurşun dolgu + beyaz yazı (mockup `.tabs`). Sekmeleri ayıran çizgiyi şeridin kurşun zemini çizer.
 */
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
              selected ? styles.selected : state.pressed || isHovered(state) ? styles.pressed : styles.idle,
              webPressFeedback(state.pressed, reducedMotion),
            ]}
          >
            <Text variant="bodyStrong" color={selected ? colors.textInverse : colors.text} numberOfLines={1}>
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
    backgroundColor: colors.outline,
    borderWidth: strokes.base,
    borderColor: colors.outline,
    borderRadius: radii.sm,
    overflow: 'hidden',
    gap: strokes.thin,
  },
  tab: {
    flex: 1,
    minHeight: layout.chipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  idle: { backgroundColor: colors.surface },
  selected: { backgroundColor: colors.outline },
  /** Basılı ve (web) fareyle üstünde. */
  pressed: { backgroundColor: colors.surfaceMuted },
});
