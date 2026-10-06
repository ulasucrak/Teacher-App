import type { AccessibilityState } from 'react-native';

export interface SelectionA11yState {
  checked?: boolean;
  selected?: boolean;
  disabled?: boolean;
}

export interface SelectionA11yProps {
  accessibilityState: AccessibilityState;
  'aria-checked'?: boolean;
  'aria-selected'?: boolean;
  'aria-disabled'?: boolean;
}

/**
 * Seçim denetimlerinin (radio / tab / checkbox) erişilebilirlik durumu.
 * react-native-web 0.21 `accessibilityState`'i DOM'a yansıtmadığı için aynı durum
 * aria-checked / aria-selected / aria-disabled olarak da verilir. Yerelde RN ikisini
 * birleştirir (aria-* önceliklidir, değerler aynı), yani davranış değişmez.
 */
export function selectionA11y(state: SelectionA11yState): SelectionA11yProps {
  const props: SelectionA11yProps = { accessibilityState: { ...state } };
  if (state.checked !== undefined) props['aria-checked'] = state.checked;
  if (state.selected !== undefined) props['aria-selected'] = state.selected;
  if (state.disabled !== undefined) props['aria-disabled'] = state.disabled;
  return props;
}
