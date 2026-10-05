import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { tones } from '@/theme';

import { OptionChip } from './OptionChip';
import { OptionGrid } from './OptionGrid';

describe('OptionChip', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exposes selected state and fires a selection haptic on press', async () => {
    const onPress = jest.fn();
    await render(<OptionChip label="Tamamlandı" tone="positive" selected={false} onPress={onPress} />);

    const chip = screen.getByRole('radio', { name: 'Tamamlandı' });
    expect(chip).not.toBeChecked();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('fills with its tone colour when selected', async () => {
    await render(<OptionChip label="Getirmedi" tone="negative" selected onPress={() => undefined} />);

    const chip = screen.getByRole('radio', { name: 'Getirmedi' });
    expect(chip).toBeChecked();
    expect(chip).toHaveStyle({ backgroundColor: tones.negative.solid });
  });

  it('uses the context label for screen readers', async () => {
    await render(
      <OptionChip
        label="Eksik"
        tone="warning"
        selected={false}
        onPress={() => undefined}
        accessibilityLabel="Ayşe Yılmaz: Eksik"
      />,
    );
    expect(screen.getByRole('radio', { name: 'Ayşe Yılmaz: Eksik' })).toBeOnTheScreen();
  });
});

describe('OptionGrid', () => {
  const options = [
    { key: 'done', label: 'Tamamlandı', tone: 'positive' as const },
    { key: 'missing', label: 'Eksik', tone: 'warning' as const },
    { key: 'none', label: 'Getirmedi', tone: 'negative' as const },
    { key: 'late', label: 'Geç getirdi', tone: 'neutral' as const },
  ];

  function Harness() {
    const [value, setValue] = useState<string | null>(null);
    return <OptionGrid options={options} value={value} onChange={setValue} contextLabel="Ali Veli" />;
  }

  it('selects exactly one option at a time', async () => {
    await render(<Harness />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Ali Veli: Eksik' }));
    expect(screen.getByRole('radio', { name: 'Ali Veli: Eksik' })).toBeChecked();

    await fireEvent.press(screen.getByRole('radio', { name: 'Ali Veli: Tamamlandı' }));
    expect(screen.getByRole('radio', { name: 'Ali Veli: Tamamlandı' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ali Veli: Eksik' })).not.toBeChecked();
  });
});
