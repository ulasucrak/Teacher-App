import { fireEvent, render, screen } from '@testing-library/react-native';

import type { FormOption } from '@/types/database';

import { OptionPicker } from './OptionPicker';

const make = (n: number): FormOption[] =>
  Array.from({ length: n }, (_, i) => ({ key: `k${i}`, label: `Seçenek ${i}`, tone: 'neutral' as const }));

describe('OptionPicker', () => {
  it('uses one segmented row for up to four options', async () => {
    const onChange = jest.fn();
    await render(<OptionPicker options={make(4)} value="k1" onChange={onChange} contextLabel="Ayşe" testIDPrefix="r" />);

    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'Ayşe: Seçenek 1' })).toBeSelected();
    await fireEvent.press(screen.getByTestId('r-k3'));
    expect(onChange).toHaveBeenCalledWith('k3');
  });

  it('wraps chips for more options', async () => {
    const onChange = jest.fn();
    await render(<OptionPicker options={make(6)} value={null} onChange={onChange} contextLabel="Ayşe" testIDPrefix="r" />);

    expect(screen.getAllByRole('radio')).toHaveLength(6);
    await fireEvent.press(screen.getByTestId('r-k5'));
    expect(onChange).toHaveBeenCalledWith('k5');
  });
});
