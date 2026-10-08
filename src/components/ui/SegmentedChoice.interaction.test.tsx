import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Platform } from 'react-native';

import { ChipGroup } from './ChipGroup';
import { OptionGrid } from './OptionGrid';
import { SegmentedChoice } from './SegmentedChoice';
import { isHovered, nextRadioIndex, radioKeyStep, webPressFeedback } from './SegmentedChoice.interaction';
import { SegmentedTabs } from './SegmentedTabs';

const key = (k: string) => ({ key: k, nativeEvent: { key: k }, preventDefault: jest.fn() });

describe('radio ok tuşu yardımcıları', () => {
  it('okları ve Home/End tuşlarını adıma çevirir', () => {
    expect(radioKeyStep('ArrowRight')).toBe('next');
    expect(radioKeyStep('ArrowDown')).toBe('next');
    expect(radioKeyStep('ArrowLeft')).toBe('prev');
    expect(radioKeyStep('ArrowUp')).toBe('prev');
    expect(radioKeyStep('Home')).toBe('first');
    expect(radioKeyStep('End')).toBe('last');
    expect(radioKeyStep('Enter')).toBeNull();
  });

  it('uçlarda başa / sona sarar', () => {
    expect(nextRadioIndex(0, 3, 'next')).toBe(1);
    expect(nextRadioIndex(2, 3, 'next')).toBe(0);
    expect(nextRadioIndex(0, 3, 'prev')).toBe(2);
    expect(nextRadioIndex(-1, 3, 'next')).toBe(0);
    expect(nextRadioIndex(-1, 3, 'prev')).toBe(2);
    expect(nextRadioIndex(1, 3, 'first')).toBe(0);
    expect(nextRadioIndex(1, 3, 'last')).toBe(2);
    expect(nextRadioIndex(0, 0, 'next')).toBe(-1);
  });

  it('hover yalnızca RN Web durumunda gelir', () => {
    expect(isHovered({ pressed: false })).toBe(false);
    expect(isHovered({ pressed: false, hovered: true } as never)).toBe(true);
  });
});

describe('yerelde (iOS) davranış değişmez', () => {
  it('basma geri bildirimi stili eklenmez', () => {
    expect(webPressFeedback(true)).toBeUndefined();
  });

  it('radiogroup klavye işleyicisi ve tabIndex verilmez', async () => {
    await render(
      <SegmentedChoice
        options={[
          { key: 'a', label: 'Geldi' },
          { key: 'b', label: 'Gelmedi' },
        ]}
        value="a"
        onChange={jest.fn()}
        testIDPrefix="seg"
      />,
    );
    expect(screen.getByTestId('seg-b').props.tabIndex).toBeUndefined();
    expect(screen.root?.props.onKeyDown).toBeUndefined();
  });
});

describe('web: radiogroup ok tuşu gezintisi', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'web'));
  afterEach(() => jest.restoreAllMocks());

  const options = [
    { key: 'p', label: 'Geldi', tone: 'positive' as const },
    { key: 'n', label: 'Gelmedi', tone: 'negative' as const },
    { key: 'l', label: 'İzinli', tone: 'neutral' as const },
  ];

  function Choice({ onChange }: { onChange?: (k: string) => void }) {
    const [value, setValue] = useState<string | null>('p');
    return (
      <SegmentedChoice
        options={options}
        value={value}
        onChange={(k) => {
          setValue(k);
          onChange?.(k);
        }}
        accessibilityLabel="Ayşe"
        testIDPrefix="seg"
      />
    );
  }

  // Grup View'ı erişilebilir öğe olmadığından rol sorgusu bulamaz; kök host öğe gruptur.
  const group = () => screen.root!;

  it('SegmentedChoice: → / ← seçimi taşır, uçta sarar', async () => {
    const onChange = jest.fn();
    await render(<Choice onChange={onChange} />);

    const right = key('ArrowRight');
    await fireEvent(group(), 'keyDown', right);
    expect(right.preventDefault).toHaveBeenCalled();
    expect(screen.getByRole('radio', { name: 'Ayşe: Gelmedi' })).toBeChecked();

    await fireEvent(group(), 'keyDown', key('ArrowDown'));
    expect(screen.getByRole('radio', { name: 'Ayşe: İzinli' })).toBeChecked();

    await fireEvent(group(), 'keyDown', key('ArrowRight'));
    expect(screen.getByRole('radio', { name: 'Ayşe: Geldi' })).toBeChecked();

    await fireEvent(group(), 'keyDown', key('ArrowLeft'));
    expect(screen.getByRole('radio', { name: 'Ayşe: İzinli' })).toBeChecked();
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(['n', 'l', 'p', 'l']);
  });

  it('SegmentedChoice: yalnızca seçili segment Tab durağıdır; diğer tuşlar yok sayılır', async () => {
    const onChange = jest.fn();
    await render(<Choice onChange={onChange} />);
    expect(screen.getByTestId('seg-p').props.tabIndex).not.toBe(-1);
    expect(screen.getByTestId('seg-n').props.tabIndex).toBe(-1);

    await fireEvent(group(), 'keyDown', key('a'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('SegmentedChoice: devre dışıyken oklar seçim değiştirmez', async () => {
    const onChange = jest.fn();
    await render(<SegmentedChoice options={options} value="p" onChange={onChange} disabled />);
    await fireEvent(group(), 'keyDown', key('ArrowRight'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('OptionGrid: ok tuşu sonraki satıra da geçer', async () => {
    function Grid() {
      const [value, setValue] = useState<string | null>('n');
      return <OptionGrid options={options} value={value} onChange={setValue} columns={2} contextLabel="Ali" />;
    }
    await render(<Grid />);
    await fireEvent(group(), 'keyDown', key('ArrowRight'));
    expect(screen.getByRole('radio', { name: 'Ali: İzinli' })).toBeChecked();
    await fireEvent(group(), 'keyDown', key('Home'));
    expect(screen.getByRole('radio', { name: 'Ali: Geldi' })).toBeChecked();
  });

  it('ChipGroup: tek seçimde oklar çalışır', async () => {
    const single = jest.fn();
    await render(<ChipGroup options={options} value={null} onChange={single} />);
    await fireEvent(group(), 'keyDown', key('ArrowRight'));
    expect(single).toHaveBeenCalledWith('p');
  });

  it('ChipGroup: çoklu seçimde (checkbox) ok tuşu işleyicisi yok', async () => {
    const multi = jest.fn();
    await render(<ChipGroup multiple options={options} value={[]} onChange={multi} />);
    expect(screen.root?.props.onKeyDown).toBeUndefined();
  });

  it('SegmentedTabs: oklarla sekme değişir', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedTabs
        tabs={[
          { key: 'mark', label: 'İşaretle' },
          { key: 'history', label: 'Geçmiş' },
        ]}
        value="mark"
        onChange={onChange}
        accessibilityLabel="Görünüm"
      />,
    );
    await fireEvent(screen.root!, 'keyDown', key('ArrowRight'));
    expect(onChange).toHaveBeenCalledWith('history');
  });

  it('basılıyken küçülme stili eklenir', () => {
    expect(webPressFeedback(true)).toEqual(
      expect.arrayContaining([expect.objectContaining({ transform: [{ scale: 0.96 }] })]),
    );
    expect(webPressFeedback(true, true)).toEqual([{ opacity: 0.85 }]);
  });
});
