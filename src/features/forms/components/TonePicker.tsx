import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui';
import { colors, layout, radii, spacing, tones } from '@/theme';
import type { FormOptionTone } from '@/types/database';

import { TONE_ORDER, toneLabels } from '../options';

interface TonePickerProps {
  value: FormOptionTone;
  onChange: (tone: FormOptionTone) => void;
  /** Ekran okuyucu bağlamı: seçenek adı. */
  contextLabel: string;
}

/**
 * Dört ton için mürekkep lekesi gibi yuvarlak örnekler. Seçili olan ✓ taşır
 * (renk tek başına anlam taşımaz).
 */
export function TonePicker({ value, onChange, contextLabel }: TonePickerProps) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={`${contextLabel} rengi`}>
      {TONE_ORDER.map((tone) => {
        const selected = tone === value;
        const t = tones[tone];
        return (
          <Pressable
            key={tone}
            onPress={() => onChange(tone)}
            accessibilityRole="radio"
            accessibilityLabel={`${contextLabel}: ${toneLabels[tone]}`}
            accessibilityState={{ selected, checked: selected }}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.ring,
                { borderColor: selected ? t.solid : 'transparent' },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: t.solid }]}>
                {selected ? <Icon name="check" size={14} color={t.onSolid} /> : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const SWATCH = spacing.xxl;
const RING = SWATCH + spacing.sm;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hit: {
    width: layout.chipHeight,
    height: layout.chipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  pressed: { backgroundColor: colors.pressedOverlay },
  ring: {
    width: RING,
    height: RING,
    borderRadius: radii.full,
    borderWidth: layout.inputBorderFocus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
