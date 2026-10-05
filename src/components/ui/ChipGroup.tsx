import { StyleSheet, View } from 'react-native';

import { spacing, type ToneName } from '@/theme';

import { OptionChip } from './OptionChip';

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

  return (
    <View
      style={styles.wrap}
      accessibilityRole={props.multiple ? undefined : 'radiogroup'}
      accessibilityLabel={contextLabel}
    >
      {options.map((option) => (
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
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
