import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui';

import { listClasses } from '../api';
import type { ClassSummary } from '../model';
import { ClassesScreen } from './ClassesScreen';

const mockPush = jest.fn();
const mockSignOut = jest.fn(async () => ({ ok: true }));

jest.mock('react-native/Libraries/Modal/Modal', () => jest.requireActual('@/test/nativeModalMock'));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('@/features/auth', () => ({
  useAuth: () => ({
    user: { email: 'ayse@okul.com', user_metadata: { full_name: 'Ayşe Yılmaz' } },
    signOut: mockSignOut,
  }),
  getDisplayName: (u: { user_metadata?: { full_name?: string } } | null) => u?.user_metadata?.full_name ?? '',
}));
jest.mock('../api', () => ({ listClasses: jest.fn() }));

const mockList = listClasses as jest.MockedFunction<typeof listClasses>;

const cls = (over: Partial<ClassSummary>): ClassSummary => ({
  id: 'c1',
  name: '5/B',
  grade: '5',
  section: 'B',
  teacher_id: 't',
  created_at: '',
  studentCount: 0,
  formCount: 0,
  ...over,
});

const renderScreen = () =>
  render(
    <ToastProvider>
      <ClassesScreen />
    </ToastProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockReset();
});

describe('ClassesScreen', () => {
  it('lists classes with counts and opens a class', async () => {
    mockList.mockResolvedValue([
      cls({ id: 'c1', name: '5/B', studentCount: 32, formCount: 3 }),
      cls({ id: 'c2', name: '6/A', studentCount: 28, formCount: 0 }),
    ]);
    await renderScreen();

    expect(await screen.findByText('5/B')).toBeOnTheScreen();
    expect(screen.getByText('Sınıflarım')).toBeOnTheScreen();
    // Selam günün saatine göre değişir; ad her zaman sonda.
    expect(screen.getByText(/^(Günaydın|İyi günler|İyi akşamlar), Ayşe Yılmaz$/)).toBeOnTheScreen();
    expect(screen.getByLabelText('5/B, 32 öğrenci, 3 form')).toBeOnTheScreen();
    expect(screen.getByText('32')).toBeOnTheScreen();
    expect(screen.getByText('3 form')).toBeOnTheScreen();
    expect(screen.getByText('Henüz form yok')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('class-row-1'));
    expect(mockPush).toHaveBeenCalledWith('/class/c2');

    await fireEvent.press(screen.getByTestId('classes-fab'));
    expect(mockPush).toHaveBeenCalledWith('/class/new');
  });

  it('shows a friendly empty state that starts the wizard (no FAB)', async () => {
    mockList.mockResolvedValue([]);
    await renderScreen();

    expect(await screen.findByText('Henüz sınıfınız yok')).toBeOnTheScreen();
    expect(screen.queryByTestId('classes-fab')).toBeNull();
    await fireEvent.press(screen.getByTestId('classes-empty-new'));
    expect(mockPush).toHaveBeenCalledWith('/class/new');
  });

  it('shows a network error with retry', async () => {
    mockList.mockRejectedValueOnce(new TypeError('Network request failed'));
    await renderScreen();

    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeOnTheScreen();
    mockList.mockResolvedValueOnce([cls({ name: '7/C' })]);
    await fireEvent.press(screen.getByTestId('classes-retry'));
    expect(await screen.findByText('7/C')).toBeOnTheScreen();
  });

  it('opens account from the header menu', async () => {
    mockList.mockResolvedValue([]);
    await renderScreen();
    await screen.findByText('Henüz sınıfınız yok');
    await fireEvent.press(screen.getByTestId('classes-menu'));
    await fireEvent.press(screen.getByTestId('classes-account'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/account'));
  });

  it('signs out from the overflow menu after confirmation', async () => {
    mockList.mockResolvedValue([cls({})]);
    await renderScreen();
    await screen.findByText('5/B');

    await fireEvent.press(screen.getByTestId('classes-menu'));
    expect(screen.getByText('ayse@okul.com')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('classes-signout'));
    await fireEvent.press(await screen.findByTestId('classes-signout-confirm-confirm'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });
});
