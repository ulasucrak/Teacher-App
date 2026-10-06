import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeleteAccountConfirmation } from './DeleteAccountConfirmation';

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);

it('shows data loss warning and supports confirm/cancel', async () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  await render(<DeleteAccountConfirmation visible loading={false} error={null} onConfirm={onConfirm} onCancel={onCancel} />);
  expect(screen.getByText(/Tüm sınıflarınız, öğrencileriniz, formlarınız/)).toBeOnTheScreen();
  expect(screen.getByText(/Bu işlem geri alınamaz/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('account-delete-confirm'));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId('account-delete-cancel'));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

it('is hidden until opened', async () => {
  await render(<DeleteAccountConfirmation visible={false} loading={false} error={null} onConfirm={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.queryByText('Hesabınız silinsin mi?')).toBeNull();
});

it('shows errors inside the sheet and blocks dismissal while deleting', async () => {
  const onCancel = jest.fn();
  await render(<DeleteAccountConfirmation visible loading error="Sunucuya ulaşılamadı." onConfirm={jest.fn()} onCancel={onCancel} />);
  expect(screen.getByText('Sunucuya ulaşılamadı.')).toBeOnTheScreen();
  expect(screen.getByTestId('account-delete-confirm')).toBeDisabled();
  expect(screen.getByTestId('account-delete-cancel')).toBeDisabled();
  await fireEvent.press(screen.getByTestId('account-delete-confirmation-close'));
  expect(onCancel).not.toHaveBeenCalled();
});
