import { act, renderHook } from '@testing-library/react-native';

import { useAccountActions, validatePasswordChange } from './useAccountActions';

const mockUpdateUser = jest.fn();
const mockRpc = jest.fn();
const mockLocalSignOut = jest.fn();
const mockSignOut = jest.fn();
const mockReplace = jest.fn();
const mockShow = jest.fn();

jest.mock('@/lib/supabase', () => ({ supabase: {
  auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...args), signOut: (...args: unknown[]) => mockLocalSignOut(...args) },
  rpc: (...args: unknown[]) => mockRpc(...args),
} }));
jest.mock('@/features/auth', () => ({
  ...jest.requireActual('@/features/auth'),
  useAuth: () => ({ signOut: mockSignOut }),
}));
jest.mock('@/components/ui', () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateUser.mockResolvedValue({ error: null });
  mockRpc.mockResolvedValue({ error: null });
  mockLocalSignOut.mockResolvedValue({ error: null });
  mockSignOut.mockResolvedValue({ ok: true });
});

it('reuses registration rules and requires matching passwords', () => {
  expect(validatePasswordChange('', '')).toBe('Şifrenizi yazın.');
  expect(validatePasswordChange('short', 'short')).toMatch(/en az 8/);
  expect(validatePasswordChange('abcdefgh', 'different')).toMatch(/eşleşmiyor/);
  expect(validatePasswordChange('abcdefgh', 'abcdefgh')).toBeNull();
});

it('does not call Supabase when password or name validation fails', async () => {
  const { result } = await renderHook(() => useAccountActions());
  await act(async () => {
    expect((await result.current.changePassword('short', 'short')).ok).toBe(false);
    expect((await result.current.changePassword('abcdefgh', 'different')).ok).toBe(false);
    expect((await result.current.updateProfile(' ')).ok).toBe(false);
  });
  expect(mockUpdateUser).not.toHaveBeenCalled();
});

it('updates trimmed metadata and password, with success messages', async () => {
  const { result } = await renderHook(() => useAccountActions());
  await act(async () => { expect(await result.current.updateProfile(' Ayşe Yılmaz ')).toEqual({ ok: true }); });
  expect(mockUpdateUser).toHaveBeenCalledWith({ data: { full_name: 'Ayşe Yılmaz' } });
  await act(async () => { expect(await result.current.changePassword('abcdefgh', 'abcdefgh')).toEqual({ ok: true }); });
  expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'abcdefgh' });
  expect(mockShow).toHaveBeenCalledWith('Şifreniz başarıyla değiştirildi');
});

it('translates server and thrown network errors into Turkish', async () => {
  const { result } = await renderHook(() => useAccountActions());
  mockUpdateUser.mockResolvedValueOnce({ error: { code: 'same_password' } });
  await act(async () => { expect(await result.current.changePassword('abcdefgh', 'abcdefgh')).toMatchObject({ ok: false, message: expect.stringMatching(/eskisiyle aynı/) }); });
  mockRpc.mockRejectedValueOnce(new Error('Network request failed'));
  await act(async () => { expect(await result.current.deleteAccount()).toMatchObject({ ok: false, message: expect.stringMatching(/İnternet/) }); });
  expect(mockLocalSignOut).not.toHaveBeenCalled();
  expect(result.current.pending).toBeNull();
});

it('calls the parameterless deletion RPC, clears local session and navigates', async () => {
  const { result } = await renderHook(() => useAccountActions());
  await act(async () => { expect(await result.current.deleteAccount()).toEqual({ ok: true }); });
  expect(mockRpc).toHaveBeenCalledWith('delete_my_account');
  expect(mockLocalSignOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(mockReplace).toHaveBeenCalledWith('/login');
});

it('keeps the session when deletion fails', async () => {
  mockRpc.mockResolvedValueOnce({ error: { message: 'permission denied' } });
  const { result } = await renderHook(() => useAccountActions());
  await act(async () => { expect((await result.current.deleteAccount()).ok).toBe(false); });
  expect(mockLocalSignOut).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('retries session cleanup without deleting an already deleted account again', async () => {
  mockLocalSignOut.mockResolvedValueOnce({ error: new Error('storage failed') });
  const { result } = await renderHook(() => useAccountActions());
  await act(async () => { expect(await result.current.deleteAccount()).toMatchObject({ ok: false, message: expect.stringMatching(/Hesabınız silindi/) }); });
  expect(mockReplace).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.deleteAccount()).toEqual({ ok: true }); });
  expect(mockRpc).toHaveBeenCalledTimes(1);
});

it('blocks concurrent operations', async () => {
  let finish!: (value: { error: null }) => void;
  mockUpdateUser.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = await renderHook(() => useAccountActions());
  let first!: Promise<unknown>;
  await act(async () => { first = result.current.updateProfile('Ayşe Yılmaz'); });
  expect(result.current.pending).toBe('profile');
  await act(async () => { expect((await result.current.deleteAccount()).ok).toBe(false); });
  expect(mockRpc).not.toHaveBeenCalled();
  await act(async () => { finish({ error: null }); await first; });
  expect(result.current.pending).toBeNull();
});

it('navigates only after successful logout', async () => {
  const { result } = await renderHook(() => useAccountActions());
  mockSignOut.mockResolvedValueOnce({ ok: false, message: 'İşlem tamamlanamadı.' });
  await act(async () => { expect((await result.current.logout()).ok).toBe(false); });
  expect(mockReplace).not.toHaveBeenCalled();
  await act(async () => { expect(await result.current.logout()).toEqual({ ok: true }); });
  expect(mockReplace).toHaveBeenCalledWith('/login');
});
