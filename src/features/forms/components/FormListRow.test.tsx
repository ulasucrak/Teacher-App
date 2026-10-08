import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { FormListItem } from '../api';
import { makeForm } from '../test-utils';
import { FormListRow } from './FormListRow';

async function renderRow(overrides: Partial<FormListItem> = {}, props: { busy?: boolean } = {}) {
  const onOpen = jest.fn();
  const onMore = jest.fn();
  await render(<FormListRow form={makeForm(overrides)} index={0} onOpen={onOpen} onMore={onMore} {...props} />);
  return { onOpen, onMore };
}

describe('FormListRow', () => {
  // Web'de Pressable <button> olur; "⋯" düğmesi satır düğmesinin torunu olursa iç içe <button> oluşur (geçersiz HTML).
  it('renders the more button as a sibling of the row button, never inside it', async () => {
    await renderRow();
    const row = screen.getByTestId('form-row-0');
    expect(within(row).queryByTestId('form-row-0-more')).toBeNull();
    expect(screen.getByTestId('form-row-0-more')).toBeOnTheScreen();
  });

  it('keeps roles and accessibility labels', async () => {
    await renderRow();
    expect(screen.getByLabelText(/^Yoklama,/)).toBe(screen.getByTestId('form-row-0'));
    expect(screen.getByRole('button', { name: 'Yoklama için diğer seçenekler' })).toBe(screen.getByTestId('form-row-0-more'));
  });

  it('opens on row press and opens the menu without opening the form on more press', async () => {
    const { onOpen, onMore } = await renderRow();
    await fireEvent.press(screen.getByTestId('form-row-0-more'));
    expect(onMore).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('form-row-0'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner instead of the more button while busy, and does not open', async () => {
    const { onOpen } = await renderRow({}, { busy: true });
    expect(screen.getByTestId('form-row-0-busy')).toBeOnTheScreen();
    expect(screen.queryByTestId('form-row-0-more')).toBeNull();
    await fireEvent.press(screen.getByTestId('form-row-0'));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
