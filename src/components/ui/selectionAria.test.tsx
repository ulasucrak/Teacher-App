import { render, screen } from '@testing-library/react-native';

import { OptionChip } from './OptionChip';
import { SegmentedChoice } from './SegmentedChoice';
import { SegmentedTabs } from './SegmentedTabs';

/**
 * Yerelde RN aria-* prop'larını accessibilityState'e katlar; host öğede görünmezler.
 * react-native-web ise yalnızca aria-*'yı DOM'a yazar. Bu yüzden Pressable'a giden
 * prop'lar doğrudan yakalanır.
 */
const mockPressableProps = new Map<string, Record<string, unknown>>();

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  const Actual = RN.Pressable;
  const Spy = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    if (typeof props.testID === 'string') mockPressableProps.set(props.testID, props);
    return React.createElement(Actual, { ...props, ref });
  });
  Spy.displayName = 'PressableSpy';
  Object.defineProperty(RN, 'Pressable', { configurable: true, enumerable: true, get: () => Spy });
  return RN;
});

const aria = (testID: string) => {
  const props = mockPressableProps.get(testID);
  if (!props) throw new Error(`Pressable bulunamadı: ${testID}`);
  return { checked: props['aria-checked'], selected: props['aria-selected'], disabled: props['aria-disabled'] };
};

beforeEach(() => mockPressableProps.clear());

describe('selection controls pass aria-* (react-native-web ignores accessibilityState)', () => {
  it('OptionChip', async () => {
    await render(
      <>
        <OptionChip label="Tamamlandı" tone="positive" selected onPress={jest.fn()} testID="on" />
        <OptionChip label="Eksik" tone="warning" selected={false} disabled onPress={jest.fn()} testID="off" />
        <OptionChip label="Çoklu" tone="neutral" selected selectionMode="checkbox" onPress={jest.fn()} testID="multi" />
      </>,
    );
    expect(aria('on')).toEqual({ checked: true, selected: true, disabled: false });
    expect(aria('off')).toEqual({ checked: false, selected: false, disabled: true });
    expect(aria('multi').checked).toBe(true);
    // Yerel davranış değişmedi.
    expect(screen.getByRole('radio', { name: 'Tamamlandı' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Eksik' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Çoklu' })).toBeChecked();
  });

  it('SegmentedChoice', async () => {
    const options = [
      { key: 'present', label: 'Geldi', tone: 'positive' as const },
      { key: 'absent', label: 'Gelmedi', tone: 'negative' as const },
    ];
    await render(<SegmentedChoice options={options} value="absent" onChange={jest.fn()} testIDPrefix="seg" />);
    expect(aria('seg-absent')).toEqual({ checked: true, selected: true, disabled: false });
    expect(aria('seg-present')).toEqual({ checked: false, selected: false, disabled: false });
    expect(screen.getByRole('radio', { name: 'Gelmedi' })).toBeChecked();
  });

  it('SegmentedTabs', async () => {
    const tabs = [
      { key: 'mark', label: 'İşaretle' },
      { key: 'history', label: 'Geçmiş' },
    ] as const;
    await render(<SegmentedTabs tabs={tabs} value="mark" onChange={jest.fn()} testIDPrefix="tab" />);
    expect(aria('tab-mark')).toEqual({ checked: undefined, selected: true, disabled: undefined });
    expect(aria('tab-history').selected).toBe(false);
    expect(screen.getByRole('tab', { name: 'İşaretle' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Geçmiş' })).not.toBeSelected();
  });
});
