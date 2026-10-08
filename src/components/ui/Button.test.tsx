import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/theme';

import { Button } from './Button';

describe('Button', () => {
  it('renders the label as an accessible button and handles presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Kaydet" onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Kaydet' });
    expect(button).toBeEnabled();
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Kaydet" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Kaydet' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is busy and not pressable while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Giriş yap" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Giriş yap' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders every variant', async () => {
    for (const variant of ['primary', 'secondary', 'ghost', 'destructive'] as const) {
      await render(<Button label={`Eylem ${variant}`} variant={variant} onPress={() => undefined} />);
      expect(screen.getByRole('button', { name: `Eylem ${variant}` })).toBeOnTheScreen();
    }
  });

  it('uses the yellow pencil fill for the primary action and passes testID', async () => {
    await render(<Button label="Devam" onPress={() => undefined} testID="next" />);
    expect(screen.getByTestId('next')).toHaveStyle({ backgroundColor: colors.accent });
  });

  it('danger turns the ghost label red (entry to a destructive flow), fill stays transparent', async () => {
    await render(<Button label="Hesabımı sil" variant="ghost" danger onPress={() => undefined} testID="del" />);
    expect(screen.getByText('Hesabımı sil')).toHaveStyle({ color: colors.danger });
    expect(screen.getByTestId('del')).toHaveStyle({ backgroundColor: 'transparent' });
  });

  it('danger does not recolour the primary action', async () => {
    await render(<Button label="Kaydet" danger onPress={() => undefined} />);
    expect(screen.getByText('Kaydet')).toHaveStyle({ color: colors.onAccent });
  });
});
