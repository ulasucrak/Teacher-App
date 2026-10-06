import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui';

import { AccountScreen } from './AccountScreen';

const mockUpdateUser = jest.fn();
const mockRpc = jest.fn();
const mockLocalSignOut = jest.fn();
const mockSignOut = jest.fn();
const mockReplace = jest.fn();

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn(), canGoBack: () => false }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {
  auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...args), signOut: (...args: unknown[]) => mockLocalSignOut(...args) },
  rpc: (...args: unknown[]) => mockRpc(...args),
} }));
jest.mock('@/features/auth', () => ({
  ...jest.requireActual('@/features/auth'),
  useAuth: () => ({ user: { email: 'ayse@okul.com', user_metadata: { full_name: 'Ayşe Yılmaz' } }, signOut: mockSignOut }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateUser.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  mockLocalSignOut.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue({ ok: true });
});

const open = () => render(<ToastProvider><AccountScreen /></ToastProvider>);

it('renders read-only email, name, hidden passwords and account actions', async () => {
  await open();
  expect(screen.getByTestId('account-email')).toHaveProp('value', 'ayse@okul.com');
  expect(screen.getByTestId('account-email')).toHaveProp('editable', false);
  expect(screen.getByTestId('account-name')).toHaveProp('value', 'Ayşe Yılmaz');
  expect(screen.getByTestId('account-password')).toHaveProp('secureTextEntry', true);
  for (const id of ['account-save-profile', 'account-change-password', 'account-logout', 'account-delete']) {
    expect(screen.getByTestId(id)).toBeOnTheScreen();
  }
});

it('saves name metadata', async () => {
  await open();
  await fireEvent.changeText(screen.getByTestId('account-name'), ' Ali Demir ');
  await fireEvent.press(screen.getByTestId('account-save-profile'));
  await waitFor(() => expect(mockUpdateUser).toHaveBeenCalledWith({ data: { full_name: 'Ali Demir' } }));
  expect(await screen.findByText('Adınız ve soyadınız kaydedildi')).toBeOnTheScreen();
});

it('validates passwords and clears inputs after successful change', async () => {
  await open();
  await fireEvent.changeText(screen.getByTestId('account-password'), 'short');
  await fireEvent.press(screen.getByTestId('account-change-password'));
  expect(screen.getByText('Şifre en az 8 karakter olmalı.')).toBeOnTheScreen();
  expect(mockUpdateUser).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByTestId('account-password'), 'abcdefgh');
  await fireEvent.changeText(screen.getByTestId('account-password-confirmation'), 'abcdefgh');
  await fireEvent.press(screen.getByTestId('account-change-password'));
  expect(await screen.findByText('Şifreniz başarıyla değiştirildi')).toBeOnTheScreen();
  expect(screen.getByTestId('account-password')).toHaveProp('value', '');
  expect(screen.getByTestId('account-password-confirmation')).toHaveProp('value', '');
});

it('requires confirmation before deleting and displays RPC errors', async () => {
  await open();
  await fireEvent.press(screen.getByTestId('account-delete'));
  expect(screen.getByText('Hesabınız silinsin mi?')).toBeOnTheScreen();
  expect(mockRpc).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('account-delete-cancel'));
  await waitFor(() => expect(screen.queryByText('Hesabınız silinsin mi?')).toBeNull());
  expect(mockRpc).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('account-delete'));
  mockRpc.mockResolvedValueOnce({ error: { message: 'Network request failed' } });
  await fireEvent.press(screen.getByTestId('account-delete-confirm'));
  expect(await screen.findByText(/İnternet bağlantınızı/)).toBeOnTheScreen();
  expect(mockReplace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByTestId('account-delete-confirm'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  expect(mockLocalSignOut).toHaveBeenCalledWith({ scope: 'local' });
});

it('logs out to the login screen', async () => {
  await open();
  await fireEvent.press(screen.getByTestId('account-logout'));
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
});
