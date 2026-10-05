import { fireEvent, render, screen } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui';

import { listClasses } from '../api';
import type { ClassSummary } from '../model';
import { ClassesScreen } from './ClassesScreen';

const mockPush = jest.fn();

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
    signOut: jest.fn(async () => ({ ok: true })),
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
  mockPush.mockClear();
  mockList.mockReset();
});

describe('ClassesScreen', () => {
  it('lists classes with counts and the teacher name', async () => {
    mockList.mockResolvedValue([
      cls({ id: 'c1', name: '5/B', studentCount: 32, formCount: 3 }),
      cls({ id: 'c2', name: '6/A', grade: '6', section: 'A', studentCount: 28, formCount: 1 }),
    ]);
    await renderScreen();

    expect(await screen.findByText('5/B')).toBeOnTheScreen();
    expect(screen.getByText('Ayşe Yılmaz')).toBeOnTheScreen();
    expect(screen.getByText('32 öğrenci')).toBeOnTheScreen();
    expect(screen.getByText('3 form')).toBeOnTheScreen();
    expect(screen.getByText('6. sınıf')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^6\/A,/ }));
    expect(mockPush).toHaveBeenCalledWith('/class/c2');

    await fireEvent.press(screen.getByRole('button', { name: 'Sınıf ekle' }));
    expect(mockPush).toHaveBeenCalledWith('/class/new');
  });

  it('shows the empty state with a create action', async () => {
    mockList.mockResolvedValue([]);
    await renderScreen();

    expect(await screen.findByText('Henüz sınıfınız yok')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Sınıf ekle' }));
    expect(mockPush).toHaveBeenCalledWith('/class/new');
  });

  it('shows a network error with retry', async () => {
    mockList.mockRejectedValueOnce(new TypeError('Network request failed'));
    await renderScreen();

    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeOnTheScreen();
    mockList.mockResolvedValueOnce([cls({ name: '7/C' })]);
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByText('7/C')).toBeOnTheScreen();
  });
});
