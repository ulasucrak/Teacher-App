import { StyleSheet, View } from 'react-native';

import { spacing, type ToneName } from '@/theme';

import { OptionChip } from './OptionChip';
import { type RovingItemProps, useRovingRadio } from './SegmentedChoice.interaction';

export interface ChipGroupItem {
  key: string;
  label: string;
  /** Ton verilmezse `neutral` (mavi). */
  tone?: ToneName;
}

interface BaseProps {
  options: readonly ChipGroupItem[];
  disabled?: boolean;
  /** Ekran okuyucu bağlamı: "Ayşe Yılmaz" → "Ayşe Yılmaz: Geldi". */
  contextLabel?: string;
  /** Kompakt çip (varsayılan true): doldurma satırında yer kazandırır. */
  compact?: boolean;
  /** Her çipe `${testIDPrefix}-${option.key}` verilir. */
  testIDPrefix?: string;
}

export interface ChipGroupSingleProps extends BaseProps {
  multiple?: false;
  value: string | null | undefined;
  onChange: (key: string) => void;
}

export interface ChipGroupMultipleProps extends BaseProps {
  multiple: true;
  value: readonly string[];
  onChange: (keys: string[]) => void;
}

export type ChipGroupProps = ChipGroupSingleProps | ChipGroupMultipleProps;

/**
 * İçerik genişliğinde, satıra sığmazsa alta kayan seçenek çipleri.
 * Doldurma ekranında öğrenci satırı için varsayılan dizilim (ızgaradan daha az yer kaplar).
 * Tek seçimde seçili çipe tekrar dokunmak `onChange` ile aynı anahtarı yollar; temizleme kararı ekranındır.
 */
export function ChipGroup(props: ChipGroupProps) {
  const { options, disabled, contextLabel, compact = true, testIDPrefix } = props;

  const isSelected = (key: string) =>
    props.multiple ? props.value.includes(key) : props.value === key;

  const press = (key: string) => {
    if (props.multiple) {
      const next = props.value.includes(key) ? props.value.filter((k) => k !== key) : [...props.value, key];
      props.onChange(next);
    } else {
      props.onChange(key);
    }
  };

  // Tek seçimde radiogroup: web'de ok tuşları seçimi taşır. Çoklu seçimde (checkbox) Tab yeterli.
  const selectedIndex = props.multiple ? -1 : options.findIndex((o) => o.key === props.value);
  const roving = useRovingRadio(options.length, selectedIndex, (i) => press(options[i].key), disabled);
  const radio = !props.multiple;

  return (
    <View
      style={styles.wrap}
      accessibilityRole={radio ? 'radiogroup' : undefined}
      accessibilityLabel={contextLabel}
      {...(radio ? roving.groupProps : null)}
    >
      {options.map((option, index) => (
        <OptionChip
          key={option.key}
          label={option.label}
          tone={option.tone ?? 'neutral'}
          selected={isSelected(option.key)}
          selectionMode={props.multiple ? 'checkbox' : 'radio'}
          disabled={disabled}
          compact={compact}
          fill={false}
          onPress={() => press(option.key)}
          accessibilityLabel={contextLabel ? `${contextLabel}: ${option.label}` : option.label}
          testID={testIDPrefix ? `${testIDPrefix}-${option.key}` : undefined}
          {...(radio ? webChipProps(roving.itemProps(index)) : null)}
        />
      ))}
    </View>
  );
}

function webChipProps(web: RovingItemProps) {
  return { pressableRef: web.ref, tabIndex: web.tabIndex };
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
